export interface AppError {
  code: string
  message: string
  userMessage: string
  retryable: boolean
}

export const ERROR_CODES = {
  AVAILABILITY_FETCH_FAILED: "AVAILABILITY_FETCH_FAILED",
  RESERVATION_CREATE_FAILED: "RESERVATION_CREATE_FAILED",
  RESERVATION_NOT_FOUND: "RESERVATION_NOT_FOUND",
  ACCOMMODATION_NOT_FOUND: "ACCOMMODATION_NOT_FOUND",
  LOCK_ACQUISITION_FAILED: "LOCK_ACQUISITION_FAILED",
  LOCK_EXPIRED: "LOCK_EXPIRED",
  PAYMENT_INITIATION_FAILED: "PAYMENT_INITIATION_FAILED",
  PAYMENT_WEBHOOK_INVALID: "PAYMENT_WEBHOOK_INVALID",
  BOOKING_CONFIRM_FAILED: "BOOKING_CONFIRM_FAILED",
  MAIL_SEND_FAILED: "MAIL_SEND_FAILED",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PAYMENT_INVALID_STATE_TRANSITION: "PAYMENT_INVALID_STATE_TRANSITION",
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export class AppErrorInstance extends Error implements AppError {
  readonly code: string
  readonly userMessage: string
  readonly retryable: boolean

  constructor({ code, message, userMessage, retryable }: AppError) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.userMessage = userMessage
    this.retryable = retryable
  }
}

export class NotImplementedError extends Error {
  constructor(methodName: string) {
    super(methodName)
    this.name = "NotImplementedError"
  }
}
