import { NotImplementedError } from "@/lib/errors/types"
import { mewsCircuitBreaker } from "@/lib/circuit-breaker"
import type {
  BookingProvider,
  AvailabilityParams,
  AvailabilityResult,
  AccommodationCategory,
  CreateReservationParams,
  ProviderReservation,
  ProviderBooking,
  ProviderAddon,
} from "../interface"

export class MewsBookingProvider implements BookingProvider {
  async getAvailability(_params: AvailabilityParams): Promise<AvailabilityResult> {
    return mewsCircuitBreaker.execute(async () => { throw new NotImplementedError("MewsProvider: implementeras när Mews-credentials finns") })
  }
  async getCategory(_id: string): Promise<AccommodationCategory> {
    return mewsCircuitBreaker.execute(async () => { throw new NotImplementedError("MewsProvider: implementeras när Mews-credentials finns") })
  }
  async createReservation(_params: CreateReservationParams): Promise<ProviderReservation> {
    return mewsCircuitBreaker.execute(async () => { throw new NotImplementedError("MewsProvider: implementeras när Mews-credentials finns") })
  }
  async confirmReservation(_reservationId: string, _paymentId: string): Promise<ProviderBooking> {
    return mewsCircuitBreaker.execute(async () => { throw new NotImplementedError("MewsProvider: implementeras när Mews-credentials finns") })
  }
  async cancelReservation(_reservationId: string): Promise<void> {
    return mewsCircuitBreaker.execute(async () => { throw new NotImplementedError("MewsProvider: implementeras när Mews-credentials finns") })
  }
  async getAddons(_categoryId: string): Promise<ProviderAddon[]> {
    return mewsCircuitBreaker.execute(async () => { throw new NotImplementedError("MewsProvider: implementeras när Mews-credentials finns") })
  }
}
