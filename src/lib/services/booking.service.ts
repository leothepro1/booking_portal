import { getBookingProvider } from "@/lib/providers"
import { db } from "@/lib/db"
import { acquireLock, releaseLock } from "@/lib/redis/locks"
import { createError, isAppError, handleProviderError, ERROR_CODES } from "@/lib/errors"
import { logger } from "@/lib/utils/logger"
import { differenceInDays } from "date-fns"
import type { Booking as PrismaBooking } from "@/generated/prisma/client"
import type { InitiateBookingResult } from "@/types/booking"

export interface InitiateBookingParams {
  categoryId: string
  ratePlanId: string
  checkIn: Date
  checkOut: Date
  guests: number
  addonSelections: Array<{ addonId: string; quantity: number }>
}

export interface ConfirmBookingParams {
  reservationId: string
  paymentId: string
  guestName: string
  guestEmail: string
  guestPhone?: string | undefined
  totalAmount: number
}

function buildLockKey(categoryId: string, checkIn: Date, checkOut: Date): string {
  const checkInStr = checkIn.toISOString().split("T")[0] ?? ""
  const checkOutStr = checkOut.toISOString().split("T")[0] ?? ""
  return `booking:${categoryId}:${checkInStr}:${checkOutStr}`
}

export async function initiateBooking(params: InitiateBookingParams): Promise<InitiateBookingResult> {
  const { categoryId, ratePlanId, checkIn, checkOut, guests, addonSelections } = params
  const nights = differenceInDays(checkOut, checkIn)

  logger.info("booking.initiate.start", { categoryId, ratePlanId, checkIn: checkIn.toISOString(), checkOut: checkOut.toISOString(), guests, addonCount: addonSelections.length })

  const lockKey = buildLockKey(categoryId, checkIn, checkOut)
  const lockAcquired = await acquireLock(lockKey, 600)

  if (!lockAcquired) {
    throw createError(ERROR_CODES.LOCK_ACQUISITION_FAILED, `Could not acquire lock for ${lockKey}`, "Dessa datum är precis nu reserverade av någon annan. Försök igen om en stund eller välj andra datum.", true)
  }

  try {
    const provider = getBookingProvider()
    const reservation = await provider.createReservation({ categoryId, ratePlanId, checkIn, checkOut, guests })

    let addonsCost = 0

    if (addonSelections.length > 0) {
      const addonIds = addonSelections.map((s) => s.addonId)
      const addons = await db.addon.findMany({ where: { id: { in: addonIds }, isActive: true, deletedAt: null } })

      if (addons.length !== addonIds.length) {
        await releaseLock(lockKey)
        throw createError(ERROR_CODES.VALIDATION_ERROR, `Some addon IDs not found`, "Ett eller flera valda tillägg är inte längre tillgängliga.", false)
      }

      const addonMap = new Map(addons.map((a) => [a.id, a]))

      await db.$transaction(async (tx) => {
        for (const selection of addonSelections) {
          const addon = addonMap.get(selection.addonId)
          if (!addon) continue
          await tx.reservationAddon.create({ data: { reservationId: reservation.id, addonId: selection.addonId, quantity: selection.quantity, priceSnapshot: addon.price } })
          addonsCost += addon.price * selection.quantity
        }
      })
    }

    const inventoryRows = await db.inventory.findMany({ where: { categoryId, date: { gte: checkIn, lt: checkOut } } })
    const category = await db.accommodationCategory.findUnique({ where: { id: categoryId } })
    const basePrice = category?.basePricePerNight ?? 0

    let accommodationCost = 0
    for (const inv of inventoryRows) {
      accommodationCost += inv.priceOverride ?? basePrice
    }

    const totalAmount = accommodationCost + addonsCost
    const lockExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

    logger.info("booking.initiated", { reservationId: reservation.id, categoryId, totalAmount, nights, addonCount: addonSelections.length })

    return { reservationId: reservation.id, lockExpiresAt, totalAmount, breakdown: { accommodationCost, addonsCost, nights } }
  } catch (error) {
    if (!isAppError(error)) {
      await releaseLock(lockKey)
      throw handleProviderError(error)
    }
    throw error
  }
}

export async function confirmBooking(params: ConfirmBookingParams): Promise<PrismaBooking> {
  const { reservationId, paymentId, guestName, guestEmail, guestPhone, totalAmount } = params

  logger.info("booking.confirm.start", { reservationId })

  try {
    const reservation = await db.reservation.findUnique({ where: { id: reservationId } })

    if (!reservation) throw createError(ERROR_CODES.RESERVATION_NOT_FOUND, `Reservation ${reservationId} not found`, "Reservationen kunde inte hittas.", false)
    if (reservation.status !== "LOCKED") throw createError(ERROR_CODES.BOOKING_CONFIRM_FAILED, `Status is ${reservation.status}`, "Reservationen är inte längre giltig.", false)

    if (reservation.lockExpiresAt && reservation.lockExpiresAt < new Date()) {
      await db.reservation.update({ where: { id: reservationId }, data: { status: "EXPIRED" } })
      throw createError(ERROR_CODES.LOCK_EXPIRED, `Lock expired`, "Din reservation har gått ut. Vänligen börja om.", false)
    }

    let booking = await db.booking.findUnique({ where: { reservationId } })
    if (!booking) {
      booking = await db.booking.create({ data: { reservationId, guestName, guestEmail, guestPhone: guestPhone ?? null, totalAmount, status: "PENDING" } })
    }

    const provider = getBookingProvider()
    await provider.confirmReservation(reservationId, paymentId)

    const confirmedBooking = await db.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED", confirmedAt: new Date() } })

    const lockKey = buildLockKey(reservation.categoryId, reservation.checkIn, reservation.checkOut)
    await releaseLock(lockKey)

    logger.info("booking.confirmed", { bookingId: confirmedBooking.id, bookingToken: confirmedBooking.bookingToken, totalAmount: confirmedBooking.totalAmount })

    return confirmedBooking
  } catch (error) {
    if (isAppError(error)) throw error
    throw handleProviderError(error)
  }
}

export async function cancelBooking(reservationId: string, reason: string): Promise<void> {
  logger.info("booking.cancel.start", { reservationId, reason })

  try {
    const reservation = await db.reservation.findUnique({ where: { id: reservationId } })
    if (!reservation) return
    if (reservation.status === "CANCELLED") return

    const provider = getBookingProvider()
    await provider.cancelReservation(reservationId)

    const lockKey = buildLockKey(reservation.categoryId, reservation.checkIn, reservation.checkOut)
    await releaseLock(lockKey)

    logger.info("booking.cancelled", { reservationId, reason })
  } catch (error) {
    if (isAppError(error)) throw error
    throw handleProviderError(error)
  }
}

export async function expireStaleReservations(): Promise<number> {
  logger.info("booking.expireStale.start")

  const staleReservations = await db.reservation.findMany({ where: { status: "LOCKED", lockExpiresAt: { lt: new Date() } } })
  let count = 0

  for (const reservation of staleReservations) {
    await cancelBooking(reservation.id, "lock_expired")
    count++
  }

  logger.info("booking.expireStale.success", { count })
  return count
}
