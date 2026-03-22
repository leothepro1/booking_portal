import { type NextRequest } from "next/server"
import { confirmBookingSchema } from "@/lib/validations/booking"
import { initiatePayment } from "@/lib/services/payment.service"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleRouteError, formatZodError } from "@/lib/api/response"
import { logger } from "@/lib/utils/logger"

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const raw: unknown = await request.json()

    const result = confirmBookingSchema.safeParse(raw)

    if (!result.success) {
      return errorResponse(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid payment params",
          userMessage: formatZodError(result.error),
          retryable: false,
        },
        400
      )
    }

    // Guard: check reservation exists and is LOCKED
    const reservation = await db.reservation.findUnique({
      where: { id: result.data.reservationId },
      include: {
        category: true,
        booking: true,
      },
    })

    if (!reservation || reservation.status !== "LOCKED") {
      return errorResponse(
        {
          code: "RESERVATION_NOT_FOUND",
          message: `Reservation ${result.data.reservationId} not found or not LOCKED`,
          userMessage: "Reservationen kunde inte hittas eller är inte längre giltig.",
          retryable: false,
        },
        409
      )
    }

    // Create booking if not already created
    let bookingId: string

    if (reservation.booking) {
      bookingId = reservation.booking.id
    } else {
      const booking = await db.booking.create({
        data: {
          reservationId: reservation.id,
          guestName: result.data.guestName,
          guestEmail: result.data.guestEmail,
          guestPhone: result.data.guestPhone ?? null,
          totalAmount: result.data.totalAmount,
          status: "PENDING",
        },
      })
      bookingId = booking.id
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    const paymentResult = await initiatePayment({
      reservationId: reservation.id,
      bookingId,
      amount: result.data.totalAmount,
      currency: "SEK",
      guestEmail: result.data.guestEmail,
      guestName: result.data.guestName,
      orderDescription: `Bokning — ${reservation.category.name}`,
      returnUrl: `${appUrl}/bokning/bekraftelse?reservationId=${reservation.id}`,
      cancelUrl: `${appUrl}/bokning/avbruten?reservationId=${reservation.id}`,
    })

    return successResponse(paymentResult, 201)
  } catch (error) {
    logger.error("api.payment.initiate.error", error)
    return handleRouteError(error)
  }
}
