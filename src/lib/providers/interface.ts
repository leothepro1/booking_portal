export interface AvailabilityParams {
  checkIn: Date
  checkOut: Date
  guests: number
}

export interface AccommodationCategory {
  id: string
  name: string
  shortDescription: string
  longDescription: string
  type: string
  imageUrls: string[]
  facilities: string[]
  maxGuests: number
  basePricePerNight: number // ören
}

export interface RatePlanResult {
  id: string
  name: string
  description: string
  cancellationPolicy: "FLEXIBLE" | "NON_REFUNDABLE" | "MODERATE"
  priceRule: "BASE" | "FIXED" | "MULTIPLIER"
  priceAmount: number
  computedPricePerNight: number // ören
  totalPrice: number // ören
  currency: string
  validFrom: Date | null
  validTo: Date | null
  includedAddons: Array<{
    addonId: string
    name: string
    quantity: number
  }>
  cancellationDescription: string
}

export interface AvailabilityCategoryResult {
  category: AccommodationCategory
  ratePlans: RatePlanResult[]
  lowestTotalPrice: number
  availableUnits: number
}

export interface AvailabilityResult {
  categories: AvailabilityCategoryResult[]
  checkIn: Date
  checkOut: Date
  nights: number
  searchId: string
}

export interface CreateReservationParams {
  categoryId: string
  ratePlanId: string
  checkIn: Date
  checkOut: Date
  guests: number
}

export interface ProviderReservation {
  id: string
  categoryId: string
  ratePlanId: string
  checkIn: Date
  checkOut: Date
  guests: number
  status: string
}

export interface ProviderBooking {
  id: string
  reservationId: string
  bookingToken: string
  guestName: string
  guestEmail: string
  totalAmount: number
  currency: string
  status: string
}

export interface ProviderAddon {
  id: string
  name: string
  description: string
  price: number
  currency: string
}

export interface BookingProvider {
  getAvailability(params: AvailabilityParams): Promise<AvailabilityResult>
  getCategory(id: string): Promise<AccommodationCategory>
  createReservation(params: CreateReservationParams): Promise<ProviderReservation>
  confirmReservation(reservationId: string, paymentId: string): Promise<ProviderBooking>
  cancelReservation(reservationId: string): Promise<void>
  getAddons(categoryId: string): Promise<ProviderAddon[]>
}
