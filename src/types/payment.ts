export type PaymentStatusType =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "CANCELLED"
  | "REFUNDED"

export type PaymentEventType =
  | "payment.initiated"
  | "payment.authorized"
  | "payment.captured"
  | "payment.cancelled"
  | "payment.refunded"
  | "payment.failed"
  | "payment.webhook.unhandled"

export interface PaymentInitiateParams {
  reservationId: string
  bookingId: string
  amount: number
  currency: string
  guestEmail: string
  guestName: string
  orderDescription: string
  returnUrl: string
  cancelUrl: string
}

export interface PaymentInitiateResult {
  paymentId: string
  providerRef: string
  checkoutUrl: string
  idempotencyKey: string
}

export interface WebhookPayload {
  type: string
  payment?: { id: string; number: number } | undefined
  transaction?: {
    id: string
    type: string
    state: string
    amount: number
  } | undefined
}
