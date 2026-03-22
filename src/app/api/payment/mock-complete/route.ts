import { type NextRequest } from "next/server"
import { z } from "zod"
import { handleMockPayment } from "@/lib/services/payment.service"
import { successResponse, errorResponse, handleRouteError, formatZodError } from "@/lib/api/response"
import { logger } from "@/lib/utils/logger"

const mockCompleteSchema = z.object({
  paymentId: z.string().uuid(),
  success: z.boolean(),
})

export async function POST(request: NextRequest): Promise<Response> {
  if (process.env.SWEDBANK_PAY_MOCK !== "true") {
    return errorResponse(
      {
        code: "NOT_FOUND",
        message: "Mock endpoint not available",
        userMessage: "Endpoint finns inte.",
        retryable: false,
      },
      404
    )
  }

  try {
    const raw: unknown = await request.json()

    const result = mockCompleteSchema.safeParse(raw)

    if (!result.success) {
      return errorResponse(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid mock complete params",
          userMessage: formatZodError(result.error),
          retryable: false,
        },
        400
      )
    }

    await handleMockPayment(result.data.paymentId, result.data.success)

    return successResponse({ processed: true })
  } catch (error) {
    logger.error("api.payment.mockComplete.error", error)
    return handleRouteError(error)
  }
}
