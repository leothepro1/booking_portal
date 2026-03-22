import { Redis } from "@upstash/redis"
import { logger } from "@/lib/utils/logger"

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token || url === "http://localhost:8079" || token === "local_dev_token") {
    logger.warn("redis.unavailable", {
      reason: "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured — using in-memory lock fallback",
    })
    return null
  }

  return new Redis({ url, token })
}

const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined
}

export const redis: Redis | null =
  globalForRedis.redis !== undefined ? globalForRedis.redis : createRedisClient()

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}
