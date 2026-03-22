import { getBookingProvider } from "@/lib/providers"
import type { AvailabilityParams, AvailabilityResult, AccommodationCategory } from "@/lib/providers/interface"
import { createError, isAppError, handleProviderError, ERROR_CODES } from "@/lib/errors"
import { logger } from "@/lib/utils/logger"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(createError(ERROR_CODES.AVAILABILITY_FETCH_FAILED, `Timeout after ${String(ms)}ms: ${errorMessage}`, "Det gick inte att hämta tillgängliga boenden just nu. Vänligen försök igen om en stund.", true))
    }, ms)
    promise.then((result) => { clearTimeout(timer); resolve(result) }).catch((error: unknown) => { clearTimeout(timer); reject(error) })
  })
}

export async function searchAvailability(params: AvailabilityParams): Promise<AvailabilityResult> {
  logger.info("availability.search.start", { checkIn: params.checkIn.toISOString(), checkOut: params.checkOut.toISOString(), guests: params.guests })
  try {
    const provider = getBookingProvider()
    const result = await withTimeout(provider.getAvailability(params), 8000, "getAvailability")
    logger.info("availability.search.success", { checkIn: result.checkIn.toISOString(), checkOut: result.checkOut.toISOString(), nights: result.nights, resultCount: result.categories.length })
    return result
  } catch (error) {
    if (isAppError(error)) throw error
    throw handleProviderError(error)
  }
}

export async function getCategoryDetail(id: string): Promise<AccommodationCategory> {
  if (!UUID_REGEX.test(id)) {
    throw createError(ERROR_CODES.ACCOMMODATION_NOT_FOUND, `Invalid UUID format: ${id}`, "Boendet kunde inte hittas.", false)
  }
  logger.info("availability.detail.start", { categoryId: id })
  try {
    const provider = getBookingProvider()
    const category = await withTimeout(provider.getCategory(id), 5000, "getCategory")
    logger.info("availability.detail.success", { categoryId: id })
    return category
  } catch (error) {
    if (isAppError(error)) throw error
    throw handleProviderError(error)
  }
}
