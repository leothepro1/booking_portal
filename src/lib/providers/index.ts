import type { BookingProvider } from "./interface"
import { MockBookingProvider } from "./mock"
import { MewsBookingProvider } from "./mews"

let providerInstance: BookingProvider | null = null

export function getBookingProvider(): BookingProvider {
  if (providerInstance) {
    return providerInstance
  }

  const providerType = process.env.BOOKING_PROVIDER

  switch (providerType) {
    case "mock":
      providerInstance = new MockBookingProvider()
      break
    case "mews":
      providerInstance = new MewsBookingProvider()
      break
    default:
      throw new Error(
        `Invalid BOOKING_PROVIDER: "${String(providerType)}". Must be "mock" or "mews".`
      )
  }

  return providerInstance
}
