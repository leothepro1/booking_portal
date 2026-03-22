import { db } from "@/lib/db"
import { createError, ERROR_CODES } from "@/lib/errors"
import { logger } from "@/lib/utils/logger"
import { differenceInDays } from "date-fns"
import type {
  BookingProvider,
  AvailabilityParams,
  AvailabilityResult,
  AvailabilityCategoryResult,
  AccommodationCategory,
  RatePlanResult,
  CreateReservationParams,
  ProviderReservation,
  ProviderBooking,
  ProviderAddon,
} from "../interface"

const CANCELLATION_DESCRIPTIONS: Record<string, string> = {
  FLEXIBLE: "Gratis avbokning fram till 24h före incheckning.",
  NON_REFUNDABLE: "Ingen återbetalning vid avbokning.",
  MODERATE: "50% återbetalning vid avbokning mer än 5 dagar i förväg.",
}

function generateDateRange(checkIn: Date, checkOut: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(checkIn)
  while (current < checkOut) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export class MockBookingProvider implements BookingProvider {
  async getAvailability(
    params: AvailabilityParams
  ): Promise<AvailabilityResult> {
    const { checkIn, checkOut, guests } = params
    const nights = differenceInDays(checkOut, checkIn)
    const dates = generateDateRange(checkIn, checkOut)

    const categories = await db.accommodationCategory.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        maxGuests: { gte: guests },
      },
      include: {
        inventory: {
          where: { date: { gte: checkIn, lt: checkOut } },
        },
        ratePlans: {
          include: {
            ratePlan: {
              include: {
                includedAddons: {
                  include: { addon: true },
                },
              },
            },
          },
        },
      },
    })

    const results: AvailabilityCategoryResult[] = []

    for (const cat of categories) {
      // Check inventory for ALL nights
      if (cat.inventory.length < nights) continue

      const inventoryByDate = new Map(
        cat.inventory.map((inv) => [inv.date.toISOString(), inv])
      )

      let allAvailable = true
      let minAvailableUnits = Infinity
      let basePriceTotal = 0

      for (const date of dates) {
        const inv = inventoryByDate.get(date.toISOString())
        if (!inv || inv.availableUnits < 1) {
          allAvailable = false
          break
        }
        if (inv.availableUnits < minAvailableUnits) {
          minAvailableUnits = inv.availableUnits
        }
        basePriceTotal += inv.priceOverride ?? cat.basePricePerNight
      }

      if (!allAvailable) continue

      const basePricePerNight = Math.round(basePriceTotal / nights)

      // Build rate plans
      const ratePlans: RatePlanResult[] = []

      for (const crp of cat.ratePlans) {
        const rp = crp.ratePlan
        if (!rp.isActive || rp.deletedAt) continue

        // Check validity window
        if (rp.validFrom && checkIn < rp.validFrom) continue
        if (rp.validTo && checkIn > rp.validTo) continue

        let computedPricePerNight: number
        switch (rp.priceRule) {
          case "BASE":
            computedPricePerNight = basePricePerNight
            break
          case "FIXED":
            computedPricePerNight = rp.priceAmount
            break
          case "MULTIPLIER":
            computedPricePerNight = Math.round(basePricePerNight * rp.priceAmount / 100)
            break
        }

        const totalPrice = computedPricePerNight * nights

        const includedAddons = rp.includedAddons
          .filter((ra) => ra.addon.isActive && !ra.addon.deletedAt)
          .map((ra) => ({
            addonId: ra.addon.id,
            name: ra.addon.name,
            quantity: ra.quantity,
          }))

        ratePlans.push({
          id: rp.id,
          name: rp.name,
          description: rp.description,
          cancellationPolicy: rp.cancellationPolicy,
          priceRule: rp.priceRule,
          priceAmount: rp.priceAmount,
          computedPricePerNight,
          totalPrice,
          currency: rp.currency,
          validFrom: rp.validFrom,
          validTo: rp.validTo,
          includedAddons,
          cancellationDescription: CANCELLATION_DESCRIPTIONS[rp.cancellationPolicy] ?? "",
        })
      }

      // Sort rate plans by price ascending
      ratePlans.sort((a, b) => a.computedPricePerNight - b.computedPricePerNight)

      if (ratePlans.length === 0) continue

      results.push({
        category: {
          id: cat.id,
          name: cat.name,
          shortDescription: cat.shortDescription,
          longDescription: cat.longDescription,
          type: cat.type,
          imageUrls: cat.imageUrls,
          facilities: cat.facilities,
          maxGuests: cat.maxGuests,
          basePricePerNight: cat.basePricePerNight,
        },
        ratePlans,
        lowestTotalPrice: ratePlans[0]?.totalPrice ?? 0,
        availableUnits: minAvailableUnits,
      })
    }

    // Sort categories by lowest total price
    results.sort((a, b) => a.lowestTotalPrice - b.lowestTotalPrice)

    return {
      categories: results,
      checkIn,
      checkOut,
      nights,
      searchId: crypto.randomUUID(),
    }
  }

  async getCategory(id: string): Promise<AccommodationCategory> {
    const cat = await db.accommodationCategory.findFirst({
      where: { id, deletedAt: null },
    })

    if (!cat) {
      throw createError(
        ERROR_CODES.ACCOMMODATION_NOT_FOUND,
        `Category ${id} not found`,
        "Boendet kunde inte hittas.",
        false
      )
    }

    return {
      id: cat.id,
      name: cat.name,
      shortDescription: cat.shortDescription,
      longDescription: cat.longDescription,
      type: cat.type,
      imageUrls: cat.imageUrls,
      facilities: cat.facilities,
      maxGuests: cat.maxGuests,
      basePricePerNight: cat.basePricePerNight,
    }
  }

  async createReservation(
    params: CreateReservationParams
  ): Promise<ProviderReservation> {
    const { categoryId, ratePlanId, checkIn, checkOut, guests } = params
    const nights = differenceInDays(checkOut, checkIn)
    const dates = generateDateRange(checkIn, checkOut)

    const reservation = await db.$transaction(async (tx) => {
      const inventoryRows = await tx.inventory.findMany({
        where: {
          categoryId,
          date: { gte: checkIn, lt: checkOut },
          availableUnits: { gte: 1 },
        },
      })

      if (inventoryRows.length < nights) {
        throw createError(
          ERROR_CODES.LOCK_ACQUISITION_FAILED,
          `Category ${categoryId} not available for ${checkIn.toISOString()} - ${checkOut.toISOString()}`,
          "Boendet är tyvärr inte längre tillgängligt för valda datum.",
          false
        )
      }

      for (const date of dates) {
        await tx.inventory.updateMany({
          where: { categoryId, date },
          data: { availableUnits: { decrement: 1 } },
        })
      }

      const lockExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

      return tx.reservation.create({
        data: {
          categoryId,
          ratePlanId,
          checkIn,
          checkOut,
          guests,
          status: "LOCKED",
          lockExpiresAt,
        },
      })
    })

    logger.info("reservation.created", {
      reservationId: reservation.id,
      categoryId,
      ratePlanId,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
    })

    return {
      id: reservation.id,
      categoryId: reservation.categoryId,
      ratePlanId: reservation.ratePlanId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      guests: reservation.guests,
      status: reservation.status,
    }
  }

  async confirmReservation(
    reservationId: string,
    _paymentId: string
  ): Promise<ProviderBooking> {
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
    })

    if (!reservation) {
      throw createError(ERROR_CODES.RESERVATION_NOT_FOUND, `Reservation ${reservationId} not found`, "Reservationen kunde inte hittas.", false)
    }

    if (reservation.status !== "LOCKED") {
      throw createError(ERROR_CODES.BOOKING_CONFIRM_FAILED, `Reservation ${reservationId} status is ${reservation.status}, expected LOCKED`, "Reservationen är inte längre giltig.", false)
    }

    if (reservation.lockExpiresAt && reservation.lockExpiresAt < new Date()) {
      await db.reservation.update({ where: { id: reservationId }, data: { status: "EXPIRED" } })
      throw createError(ERROR_CODES.LOCK_EXPIRED, `Reservation ${reservationId} lock expired`, "Reservationen har gått ut. Vänligen börja om.", false)
    }

    await db.reservation.update({ where: { id: reservationId }, data: { status: "CONFIRMED" } })

    const booking = await db.booking.findUnique({ where: { reservationId } })

    if (!booking) {
      throw createError(ERROR_CODES.BOOKING_CONFIRM_FAILED, `No booking found for reservation ${reservationId}`, "Bokningen kunde inte bekräftas. Kontakta kundtjänst.", false)
    }

    const confirmedBooking = await db.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    })

    logger.info("reservation.confirmed", { reservationId, bookingId: confirmedBooking.id })

    return {
      id: confirmedBooking.id,
      reservationId: confirmedBooking.reservationId,
      bookingToken: confirmedBooking.bookingToken,
      guestName: confirmedBooking.guestName,
      guestEmail: confirmedBooking.guestEmail,
      totalAmount: confirmedBooking.totalAmount,
      currency: confirmedBooking.currency,
      status: confirmedBooking.status,
    }
  }

  async cancelReservation(reservationId: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id: reservationId } })

      if (!reservation) {
        throw createError(ERROR_CODES.RESERVATION_NOT_FOUND, `Reservation ${reservationId} not found`, "Reservationen kunde inte hittas.", false)
      }

      if (reservation.status === "CANCELLED") return

      const dates = generateDateRange(reservation.checkIn, reservation.checkOut)

      for (const date of dates) {
        await tx.inventory.updateMany({
          where: { categoryId: reservation.categoryId, date },
          data: { availableUnits: { increment: 1 } },
        })
      }

      await tx.reservation.update({ where: { id: reservationId }, data: { status: "CANCELLED" } })
    })

    logger.info("reservation.cancelled", { reservationId })
  }

  async getAddons(categoryId: string): Promise<ProviderAddon[]> {
    const links = await db.categoryAddon.findMany({
      where: { categoryId },
      include: { addon: true },
    })

    return links
      .filter((link) => link.addon.isActive && link.addon.deletedAt === null)
      .map((link) => ({
        id: link.addon.id,
        name: link.addon.name,
        description: link.addon.description,
        price: link.addon.price,
        currency: link.addon.currency,
      }))
  }
}
