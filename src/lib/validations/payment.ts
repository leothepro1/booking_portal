import { z } from "zod"

export const paymentWebhookSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["PENDING", "AUTHORIZED", "CAPTURED", "CANCELLED", "REFUNDED"]),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
})
