import { createError, ERROR_CODES } from "@/lib/errors"
import { logger } from "@/lib/utils/logger"

type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN"

interface CircuitBreakerConfig {
  name: string
  failureThreshold: number
  successThreshold: number
  timeout: number
}

export class CircuitBreaker {
  private state: CircuitBreakerState = "CLOSED"
  private failureCount = 0
  private successCount = 0
  private lastFailureTime: number | undefined

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (this.shouldAttemptReset()) {
        this.transitionTo("HALF_OPEN")
      } else {
        throw createError(
          ERROR_CODES.PROVIDER_UNAVAILABLE,
          `Circuit breaker ${this.config.name} is OPEN`,
          "Tjänsten är tillfälligt otillgänglig. Vänligen försök igen om en stund.",
          true
        )
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successCount++
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo("CLOSED")
        this.failureCount = 0
        this.successCount = 0
      }
    } else if (this.state === "CLOSED") {
      this.failureCount = 0
    }
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.state === "HALF_OPEN") {
      this.transitionTo("OPEN")
      this.successCount = 0
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.transitionTo("OPEN")
    }
  }

  private shouldAttemptReset(): boolean {
    if (this.lastFailureTime === undefined) return true
    return this.lastFailureTime + this.config.timeout < Date.now()
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const from = this.state
    this.state = newState
    logger.warn("circuit-breaker.state-change", {
      name: this.config.name,
      from,
      to: newState,
    })
  }
}

export const mewsCircuitBreaker = new CircuitBreaker({
  name: "mews",
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
})

export const swedbankCircuitBreaker = new CircuitBreaker({
  name: "swedbank-pay",
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 15000,
})
