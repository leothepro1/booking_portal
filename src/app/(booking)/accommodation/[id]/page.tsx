import { redirect } from "next/navigation"
import Link from "next/link"
import { getCategoryDetail } from "@/lib/services/availability.service"
import { ImageGallery } from "@/components/booking/image-gallery"
import { Icon } from "@/components/ui/icon"
import { isAppError } from "@/lib/errors"

interface AccommodationPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccommodationPage({ params, searchParams }: AccommodationPageProps): Promise<React.ReactElement> {
  const { id } = await params
  const sp = await searchParams
  const checkIn = typeof sp["checkIn"] === "string" ? sp["checkIn"] : undefined
  const checkOut = typeof sp["checkOut"] === "string" ? sp["checkOut"] : undefined
  const guests = typeof sp["guests"] === "string" ? sp["guests"] : undefined

  if (!checkIn || !checkOut || !guests) redirect("/")

  let category
  try {
    category = await getCategoryDetail(id)
  } catch (error: unknown) {
    if (isAppError(error) && error.code === "ACCOMMODATION_NOT_FOUND") redirect("/")
    throw error
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-[1250px] px-4 pt-6 md:px-8">
        {/* Breadcrumb */}
        <nav className="mb-3 flex items-center gap-1 text-[14px]" aria-label="Breadcrumb">
          <Link
            href={`/search?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`}
            className="text-[#6b6b6b] transition-colors duration-150 hover:text-[#202020]"
          >
            Sök
          </Link>
          <Icon name="chevron_right" size={16} className="text-[#9b9b9b]" />
          <span className="text-[#202020] font-medium">{category.name}</span>
        </nav>

        <h1 className="mb-4 text-[32px] font-bold text-[#202020]">{category.name}</h1>
        <ImageGallery images={category.imageUrls} name={category.name} />
      </div>

      {/* Placeholder for rest of product page */}
      <div className="mx-auto w-full max-w-[1250px] px-4 py-8 md:px-8">
        <p className="text-[15px] leading-relaxed text-[#6b6b6b]">{category.longDescription}</p>
      </div>
    </div>
  )
}
