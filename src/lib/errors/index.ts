import { AppErrorInstance, ERROR_CODES } from "./types"
import type { AppError, ErrorCode } from "./types"

export { AppErrorInstance, NotImplementedError, ERROR_CODES } from "./types"
export type { AppError, ErrorCode } from "./types"

export function createError(
  code: ErrorCode,
  message: string,
  userMessage: string,
  retryable = false
): AppErrorInstance {
  return new AppErrorInstance({ code, message, userMessage, retryable })
}

export function isAppError(error: unknown): error is AppErrorInstance {
  return error instanceof AppErrorInstance
}

export function handleProviderError(error: unknown): AppErrorInstance {
  if (isAppError(error)) {
    return error
  }

  const message =
    error instanceof Error ? error.message : "Unknown provider error"

  return new AppErrorInstance({
    code: ERROR_CODES.PROVIDER_UNAVAILABLE,
    message,
    userMessage:
      "Tjänsten är tillfälligt otillgänglig. Försök igen om en stund.",
    retryable: false,
  })
}
