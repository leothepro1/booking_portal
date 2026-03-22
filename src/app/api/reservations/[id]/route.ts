import { type NextRequest } from "next/server"
import { cancelBooking } from "@/lib/services/booking.service"
import { successResponse, errorResponse, handleRouteError } from "@/lib/api/response"
import { logger } from "@/lib/utils/logger"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params

    // Validate UUID
    if (!UUID_REGEX.test(id)) {
      return errorResponse(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid reservation ID format",
          userMessage: "Ogiltigt reservations-ID.",
          retryable: false,
        },
        400
      )
    }

    // Parse optional body for reason
    let reason = "user_cancelled"
    try {
      const body: unknown = await request.json()
      if (
        typeof body === "object" &&
        body !== null &&
        "reason" in body &&
        typeof (body as { reason: unknown }).reason === "string"
      ) {
        reason = (body as { reason: string }).reason
      }
    } catch {
      // No body or invalid JSON — use default reason
    }

    await cancelBooking(id, reason)

    return successResponse({ cancelled: true }, 200)
  } catch (error) {
    logger.error("api.reservations.delete.error", error)
    return handleRouteError(error)
  }
}
