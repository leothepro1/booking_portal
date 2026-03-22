import { type NextRequest } from "next/server"
import { expireStaleReservations } from "@/lib/services/booking.service"
import { successResponse, errorResponse, handleRouteError } from "@/lib/api/response"
import { logger } from "@/lib/utils/logger"

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse(
      {
        code: "UNAUTHORIZED",
        message: "Invalid or missing CRON_SECRET",
        userMessage: "Obehörig åtkomst.",
        retryable: false,
      },
      401
    )
  }

  try {
    const count = await expireStaleReservations()

    logger.info("cron.expireReservations.done", { expired: count })

    return successResponse({ expired: count })
  } catch (error) {
    logger.error("cron.expireReservations.error", error)
    return handleRouteError(error)
  }
}
