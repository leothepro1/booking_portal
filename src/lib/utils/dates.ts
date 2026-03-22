import { format, differenceInDays, startOfDay } from "date-fns"
import { sv } from "date-fns/locale"

export function formatSwedishDate(date: Date): string {
  return format(date, "d MMMM yyyy", { locale: sv })
}

export function formatDateRange(checkIn: Date, checkOut: Date): string {
  const sameMonth =
    checkIn.getMonth() === checkOut.getMonth() &&
    checkIn.getFullYear() === checkOut.getFullYear()

  if (sameMonth) {
    const inDay = format(checkIn, "d", { locale: sv })
    const outFormatted = format(checkOut, "d MMMM yyyy", { locale: sv })
    return `${inDay}–${outFormatted}`
  }

  const inFormatted = format(checkIn, "d MMMM", { locale: sv })
  const outFormatted = format(checkOut, "d MMMM yyyy", { locale: sv })
  return `${inFormatted} – ${outFormatted}`
}

export function getNights(checkIn: Date, checkOut: Date): number {
  return differenceInDays(checkOut, checkIn)
}

export function isValidDateRange(checkIn: Date, checkOut: Date): boolean {
  const today = startOfDay(new Date())
  const checkInDay = startOfDay(checkIn)
  const checkOutDay = startOfDay(checkOut)

  if (checkInDay < today) return false
  if (checkOutDay <= checkInDay) return false

  const nights = differenceInDays(checkOutDay, checkInDay)
  if (nights > 30) return false

  return true
}
