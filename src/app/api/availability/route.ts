import { type NextRequest } from "next/server"
import { availabilitySearchSchema } from "@/lib/validations/availability"
import { searchAvailability } from "@/lib/services/availability.service"
import { successResponse, errorResponse, handleRouteError, formatZodError } from "@/lib/api/response"
import { redis } from "@/lib/redis"
import { logger } from "@/lib/utils/logger"

async function checkRateLimit(ip: string): Promise<boolean> {
  if (!redis) {
    return true // fail open
  }

  try {
    const key = `ratelimit:availability:${ip}`
    const current = await redis.incr(key)

    if (current === 1) {
      await redis.expire(key, 60)
    }

    return current <= 30
  } catch {
    // fail open — om Redis misslyckas, tillåt request
    return true
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    const allowed = await checkRateLimit(ip)

    if (!allowed) {
      return errorResponse(
        {
          code: "RATE_LIMITED",
          message: "Rate limit exceeded",
          userMessage: "För många förfrågningar. Vänligen vänta en stund.",
          retryable: true,
        },
        429
      )
    }

    // Parse query params
    const { searchParams } = request.nextUrl
    const raw = {
      checkIn: searchParams.get("checkIn") ?? undefined,
      checkOut: searchParams.get("checkOut") ?? undefined,
      guests: searchParams.get("guests") ?? undefined,
    }

    // Validate
    const result = availabilitySearchSchema.safeParse(raw)

    if (!result.success) {
      return errorResponse(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid availability search params",
          userMessage: formatZodError(result.error),
          retryable: false,
        },
        400
      )
    }

    // Call service
    const data = await searchAvailability(result.data)

    // Return with cache headers
    const response = successResponse(data)
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    )

    return response
  } catch (error) {
    logger.error("api.availability.error", error)
    return handleRouteError(error)
  }
}
