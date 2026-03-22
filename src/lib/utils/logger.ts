const SENSITIVE_FIELDS = new Set([
  "email",
  "phone",
  "cardNumber",
  "personnummer",
  "password",
  "token",
  "secret",
])

function redact(data: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.has(key)) {
      redacted[key] = "[REDACTED]"
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      redacted[key] = redact(value as Record<string, unknown>)
    } else {
      redacted[key] = value
    }
  }
  return redacted
}

const isProduction = process.env.APP_ENV === "production"

function formatLogEntry(
  level: string,
  event: string,
  data?: Record<string, unknown>,
  error?: unknown
): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    event,
  }

  if (data) {
    entry["data"] = redact(data)
  }

  if (error instanceof Error) {
    entry["error"] = {
      name: error.name,
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    }
  } else if (error !== undefined) {
    entry["error"] = { message: String(error) }
  }

  return JSON.stringify(entry)
}

export const logger = {
  info(event: string, data?: Record<string, unknown>): void {
    const output = formatLogEntry("info", event, data)
    process.stdout.write(output + "\n")
  },

  warn(event: string, data?: Record<string, unknown>): void {
    const output = formatLogEntry("warn", event, data)
    process.stdout.write(output + "\n")
  },

  error(event: string, error: unknown, data?: Record<string, unknown>): void {
    const output = formatLogEntry("error", event, data, error)
    process.stderr.write(output + "\n")
  },
}
