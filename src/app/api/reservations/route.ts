import { type NextRequest } from "next/server"
import { initiateBookingSchema } from "@/lib/validations/booking"
import { initiateBooking } from "@/lib/services/booking.service"
import { successResponse, errorResponse, handleRouteError, formatZodError } from "@/lib/api/response"
import { logger } from "@/lib/utils/logger"

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // CSRF check
    const xRequestedWith = request.headers.get("x-requested-with")
    if (xRequestedWith !== "XMLHttpRequest") {
      return errorResponse(
        {
          code: "FORBIDDEN",
          message: "Missing x-requested-with header",
          userMessage: "Ogiltig förfrågan.",
          retryable: false,
        },
        403
      )
    }

    // Parse body
    const raw: unknown = await request.json()

    // Validate
    const result = initiateBookingSchema.safeParse(raw)

    if (!result.success) {
      return errorResponse(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid booking params",
          userMessage: formatZodError(result.error),
          retryable: false,
        },
        400
      )
    }

    // Call service
    const data = await initiateBooking(result.data)

    return successResponse(data, 201)
  } catch (error) {
    logger.error("api.reservations.error", error)
    return handleRouteError(error)
  }
}
