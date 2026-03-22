import { type NextRequest } from "next/server"
import { successResponse } from "@/lib/api/response"
import { processWebhook } from "@/lib/services/payment.service"
import { logger } from "@/lib/utils/logger"
import type { WebhookPayload } from "@/types/payment"

export async function POST(request: NextRequest): Promise<Response> {
  // Read raw body and signature
  const rawBody = await request.text()
  const signature = request.headers.get("Payex-Hmac-Sha256") ?? ""

  logger.info("payment.webhook.received", {
    contentType: request.headers.get("content-type") ?? "unknown",
    hasSignature: signature.length > 0,
  })

  // Return 200 immediately — never block Swedbank Pay
  const response = successResponse({ received: true }, 200)

  // Process asynchronously
  setImmediate(() => {
    try {
      const payload = JSON.parse(rawBody) as WebhookPayload
      void processWebhook(payload, signature).catch((error: unknown) => {
        logger.error("webhook.process.failed", error)
      })
    } catch (parseError) {
      logger.error("webhook.parse.failed", parseError, {
        bodyLength: rawBody.length,
      })
    }
  })

  return response
}
