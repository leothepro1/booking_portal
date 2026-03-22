import { z } from "zod"

export const initiateBookingSchema = z.object({
  categoryId: z.string().uuid("Ogiltigt kategori-ID"),
  ratePlanId: z.string().uuid("Ogiltigt prisplan-ID"),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((s) => new Date(s)),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((s) => new Date(s)),
  guests: z.coerce.number().int().min(1).max(10),
  addonSelections: z.array(z.object({ addonId: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(10) })).default([]),
})

export const confirmBookingSchema = z.object({
  reservationId: z.string().uuid(),
  paymentId: z.string().min(1),
  guestName: z.string().min(2).max(100),
  guestEmail: z.string().email("Ogiltig e-postadress"),
  guestPhone: z.string().optional(),
  totalAmount: z.number().int().positive(),
})
