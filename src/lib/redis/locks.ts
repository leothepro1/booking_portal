import { redis } from "./index"
import { logger } from "@/lib/utils/logger"

// In-memory fallback for dev when Redis is not configured
const inMemoryLocks = new Map<string, number>()

export async function acquireLock(
  key: string,
  ttlSeconds: number
): Promise<boolean> {
  const lockKey = `lock:${key}`

  if (redis) {
    const result = await redis.set(lockKey, "1", { nx: true, ex: ttlSeconds })
    return result === "OK"
  }

  // In-memory fallback
  const existing = inMemoryLocks.get(lockKey)
  if (existing && existing > Date.now()) {
    return false
  }

  inMemoryLocks.set(lockKey, Date.now() + ttlSeconds * 1000)
  logger.warn("redis.lock.inmemory", { lockKey, ttlSeconds })
  return true
}

export async function releaseLock(key: string): Promise<void> {
  const lockKey = `lock:${key}`

  if (redis) {
    await redis.del(lockKey)
    return
  }

  // In-memory fallback
  inMemoryLocks.delete(lockKey)
}
