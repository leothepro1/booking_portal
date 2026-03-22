import { NextResponse } from "next/server"
import { isAppError, ERROR_CODES } from "@/lib/errors"
import type { AppError } from "@/lib/errors"
import { logger } from "@/lib/utils/logger"

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(error: AppError, status: number): NextResponse {
  logger.warn("api.error", {
    code: error.code,
    status,
    retryable: error.retryable,
  })

  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
        retryable: error.retryable,
      },
    },
    { status }
  )
}

const ERROR_STATUS_MAP: Record<string, number> = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.ACCOMMODATION_NOT_FOUND]: 404,
  [ERROR_CODES.RESERVATION_NOT_FOUND]: 404,
  [ERROR_CODES.LOCK_ACQUISITION_FAILED]: 409,
  [ERROR_CODES.LOCK_EXPIRED]: 409,
  [ERROR_CODES.BOOKING_CONFIRM_FAILED]: 409,
  [ERROR_CODES.AVAILABILITY_FETCH_FAILED]: 503,
  [ERROR_CODES.PROVIDER_UNAVAILABLE]: 503,
  [ERROR_CODES.PAYMENT_INITIATION_FAILED]: 502,
  [ERROR_CODES.PAYMENT_WEBHOOK_INVALID]: 400,
  [ERROR_CODES.MAIL_SEND_FAILED]: 502,
  [ERROR_CODES.RESERVATION_CREATE_FAILED]: 500,
  [ERROR_CODES.PAYMENT_INVALID_STATE_TRANSITION]: 409,
}

export function handleRouteError(error: unknown): NextResponse {
  if (isAppError(error)) {
    const status = ERROR_STATUS_MAP[error.code] ?? 500
    return errorResponse(error, status)
  }

  logger.error(
    "api.unhandledError",
    error,
    { type: error instanceof Error ? error.name : "unknown" }
  )

  return errorResponse(
    {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      userMessage: "Ett oväntat fel uppstod. Vänligen försök igen.",
      retryable: true,
    },
    500
  )
}

export function formatZodError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.length > 0 ? `${issue.path.map(String).join(".")}: ` : ""
      return `${field}${issue.message}`
    })
    .join(". ")
}
