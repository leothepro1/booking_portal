import type { initiateBookingSchema, confirmBookingSchema } from "@/lib/validations/booking"
import type { availabilitySearchSchema } from "@/lib/validations/availability"
import type { z } from "zod"

export type InitiateBookingParams = z.infer<typeof initiateBookingSchema>
export type ConfirmBookingParams = z.infer<typeof confirmBookingSchema>
export type AvailabilitySearchParams = z.infer<typeof availabilitySearchSchema>

export type InitiateBookingResult = {
  reservationId: string
  lockExpiresAt: Date
  totalAmount: number
  breakdown: {
    accommodationCost: number
    addonsCost: number
    nights: number
  }
}

export type BookingConfirmationParams = {
  guestName: string
  guestEmail: string
  bookingToken: string
  accommodationName: string
  checkIn: Date
  checkOut: Date
  nights: number
  totalAmount: number
  addons: Array<{
    name: string
    quantity: number
    price: number
  }>
}
