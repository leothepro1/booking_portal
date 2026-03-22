import { redirect } from "next/navigation"
import { searchAvailability } from "@/lib/services/availability.service"
import { formatDateRange, getNights } from "@/lib/utils/dates"
import { Icon } from "@/components/ui/icon"
import { AccommodationCard } from "@/components/booking/accommodation-card"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { H1, H2, BODY, UI, CAPTION } from "@/lib/typography"

const TEXT = {
  EMPTY_TITLE: "Inga lediga boenden hittades",
  EMPTY_DESCRIPTION: "Prova att ändra dina datum eller boendetyp.",
  CHANGE_SEARCH: "Ändra sökning",
  RESULTS_TITLE: "Lediga boenden",
  NIGHTS_SUFFIX: "nätter",
  NIGHT_SUFFIX: "natt",
} as const

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SearchPage({ searchParams }: SearchPageProps): Promise<React.ReactElement> {
  const params = await searchParams
  const checkIn = typeof params["checkIn"] === "string" ? params["checkIn"] : undefined
  const checkOut = typeof params["checkOut"] === "string" ? params["checkOut"] : undefined
  const guests = typeof params["guests"] === "string" ? params["guests"] : undefined

  if (!checkIn || !checkOut || !guests) redirect("/")

  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)
  const guestCount = parseInt(guests, 10)

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || isNaN(guestCount)) redirect("/")

  const result = await searchAvailability({ checkIn: checkInDate, checkOut: checkOutDate, guests: guestCount })

  const nights = getNights(checkInDate, checkOutDate)
  const nightLabel = nights === 1 ? TEXT.NIGHT_SUFFIX : TEXT.NIGHTS_SUFFIX
  const dateRange = formatDateRange(checkInDate, checkOutDate)

  if (result.categories.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">

        <Icon name="search_off" size={48} className="mb-6 text-[#9b9b9b]" />
        <h2 className={cn(H2, "mb-2 text-[#202020]")}>{TEXT.EMPTY_TITLE}</h2>
        <p className={cn(BODY, "mb-8 text-[#6b6b6b]")}>{TEXT.EMPTY_DESCRIPTION}</p>
        <Link href="/" className={cn(UI, "rounded-lg bg-[#202020] px-6 py-3 text-white transition-all duration-200 hover:bg-[#3a3a3a]")}>{TEXT.CHANGE_SEARCH}</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1250px] px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6">
        <h1 className={cn(H1, "text-[#202020]")}>{TEXT.RESULTS_TITLE}</h1>
        <p className={cn(CAPTION, "mt-1")}>
          {dateRange} — {String(nights)} {nightLabel}, {guests} gäster — {String(result.categories.length)} boenden
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {result.categories.map((item) => (
          <AccommodationCard
            key={item.category.id}
            id={item.category.id}
            name={item.category.name}
            description={item.category.shortDescription}
            type={item.category.type}
            imageUrls={item.category.imageUrls}
            maxGuests={item.category.maxGuests}
            pricePerNight={item.category.basePricePerNight}
            totalPrice={item.lowestTotalPrice}
            nights={nights}
            guests={guestCount}
            checkIn={checkIn}
            checkOut={checkOut}
          />
        ))}
      </div>
    </div>
  )
}
