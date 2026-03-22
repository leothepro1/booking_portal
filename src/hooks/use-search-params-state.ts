"use client"

import { useSearchParams } from "next/navigation"

type AccommodationType = "CAMPING" | "APARTMENT" | "HOTEL" | "CABIN"

const VALID_TYPES = new Set<string>(["CAMPING", "APARTMENT", "HOTEL", "CABIN"])

function parseDate(s: string | null): Date | null {
  if (!s) return null
  const match = /^\d{4}-\d{2}-\d{2}$/.test(s)
  if (!match) return null
  const date = new Date(s)
  if (isNaN(date.getTime())) return null
  return date
}

function parseNumber(s: string | null, fallback: number): number {
  if (!s) return fallback
  const num = parseInt(s, 10)
  if (isNaN(num)) return fallback
  return num
}

function parseTypes(s: string | null): AccommodationType[] {
  if (!s) return []
  return s
    .split(",")
    .filter((t) => VALID_TYPES.has(t)) as AccommodationType[]
}

interface SearchParamsState {
  checkIn: Date | null
  checkOut: Date | null
  adults: number
  children: number
  accommodationTypes: AccommodationType[]
}

export function useSearchParamsState(): SearchParamsState {
  const searchParams = useSearchParams()

  return {
    checkIn: parseDate(searchParams.get("checkIn")),
    checkOut: parseDate(searchParams.get("checkOut")),
    adults: parseNumber(searchParams.get("adults"), 2),
    children: parseNumber(searchParams.get("children"), 0),
    accommodationTypes: parseTypes(searchParams.get("types")),
  }
}
