import { z } from "zod"
import { startOfDay } from "date-fns"
import { getNights } from "@/lib/utils/dates"

export const availabilitySearchSchema = z
  .object({
    checkIn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ogiltigt datumformat")
      .transform((s) => new Date(s))
      .refine((d) => d >= startOfDay(new Date()), {
        message: "Incheckning kan inte vara i dåtid",
      }),
    checkOut: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ogiltigt datumformat")
      .transform((s) => new Date(s))
      .refine((d) => d > new Date(), {
        message: "Utcheckning måste vara i framtiden",
      }),
    guests: z.coerce.number().int().min(1).max(10),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Utcheckning måste vara efter incheckning",
    path: ["checkOut"],
  })
  .refine((data) => getNights(data.checkIn, data.checkOut) <= 30, {
    message: "Maximalt 30 nätters bokning",
    path: ["checkOut"],
  })
