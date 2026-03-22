"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { formatSEK } from "@/lib/utils/currency"

interface AccommodationCardProps {
  id: string
  name: string
  description: string
  type: string
  imageUrls: string[]
  maxGuests: number
  pricePerNight: number
  totalPrice: number | undefined
  nights: number
  guests: number
  checkIn: string
  checkOut: string
}

const TYPE_LABELS: Record<string, string> = {
  CAMPING: "Campingtomter",
  APARTMENT: "Lägenheter",
  HOTEL: "Hotell",
  CABIN: "Stugor",
}

const FEATURES: Record<string, Array<{ icon: string; label: string }>> = {
  HOTEL: [
    { icon: "restaurant", label: "Frukost" },
    { icon: "cleaning_services", label: "Städning" },
    { icon: "bed", label: "Bäddade sängar" },
  ],
  CABIN: [
    { icon: "kitchen", label: "Kök" },
    { icon: "deck", label: "Uteplats" },
    { icon: "pets", label: "Husdjur OK" },
  ],
  CAMPING: [
    { icon: "bolt", label: "El" },
    { icon: "local_parking", label: "Parkering" },
    { icon: "wc", label: "Servicehus" },
  ],
  APARTMENT: [
    { icon: "kitchen", label: "Kök" },
    { icon: "balcony", label: "Balkong" },
    { icon: "bathtub", label: "Badrum" },
  ],
}

export function AccommodationCard({
  id,
  name,
  description,
  type,
  imageUrls,
  pricePerNight,
  totalPrice,
  nights,
  guests,
  checkIn,
  checkOut,
}: AccommodationCardProps): React.ReactElement {
  const [imgIndex, setImgIndex] = useState(0)
  const images = imageUrls.length > 0 ? imageUrls.slice(0, 3) : []
  const hasMultiple = images.length > 1

  const goPrev = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setImgIndex((i) => (i > 0 ? i - 1 : images.length - 1))
  }, [images.length])

  const goNext = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setImgIndex((i) => (i < images.length - 1 ? i + 1 : 0))
  }, [images.length])

  const features = FEATURES[type] ?? []
  const nightLabel = nights === 1 ? "natt" : "nätter"
  const guestLabel = guests === 1 ? "gäst" : "gäster"

  return (
    <Link
      href={`/accommodation/${id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${String(guests)}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white transition-shadow duration-200 hover:shadow-lg md:h-[310px] md:flex-row"
    >
      {/* ── Left: Image carousel (35%) ── */}
      <div className="relative h-[240px] w-full shrink-0 overflow-hidden md:h-full md:w-[35%]">
        {images.length > 0 ? (
          images.map((url, i) => (
            <Image
              key={url}
              src={url}
              alt={i === 0 ? name : `${name} bild ${String(i + 1)}`}
              fill
              className="object-cover transition-opacity duration-300"
              style={{ opacity: i === imgIndex ? 1 : 0 }}
              sizes="(max-width: 768px) 100vw, 35vw"
              priority={i === 0}
            />
          ))
        ) : (
          <div className="flex size-full items-center justify-center bg-[#f4f4f6]">
            <Icon name="image" size={48} className="text-[#d4d5d9]" />
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 z-10 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-opacity duration-150 hover:bg-black/50 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Föregående bild"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 z-10 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-opacity duration-150 hover:bg-black/50 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Nästa bild"
            >
              <Icon name="chevron_right" size={20} />
            </button>
            <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {images.map((_, i) => (
                <span
                  key={String(i)}
                  className="size-1.5 rounded-full transition-colors duration-200"
                  style={{ backgroundColor: i === imgIndex ? "white" : "rgba(255,255,255,0.5)" }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Right: Content (65%) — two-column layout ── */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left content column: title + description + chips */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="mb-2 text-[23px] font-bold leading-[1.2] text-[#202020]">
            {name}
          </h3>
          <p className="mb-4 line-clamp-3 text-[15px] leading-[1.45] text-[#6b6b6b]">
            {description}
          </p>

          {features.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2">
              {features.map((f) => (
                <span key={f.label} className="flex items-center gap-1.5">
                  <span className="flex size-[26px] items-center justify-center rounded-full" style={{ backgroundColor: "#FFE6A3" }}>
                    <Icon name={f.icon} size={14} weight={600} className="text-[#7a6520]" />
                  </span>
                  <span className="text-[13px] font-bold text-[#202020]">{f.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right content column: price + CTA */}
        <div className="flex shrink-0 flex-col items-end justify-between border-t border-[#f0f0f0] p-5 md:w-[180px] md:border-t-0 md:border-l md:pl-5">
          <div className="text-right">
            <span className="text-[13px] text-[#9b9b9b]">från:</span>
            <p className="text-[20px] font-bold leading-tight text-[#202020]">
              {formatSEK(totalPrice ?? pricePerNight * nights)}
            </p>
            <p className="mt-1 text-[13px] text-[#9b9b9b]">
              {String(nights)} {nightLabel} · {String(guests)} {guestLabel}
            </p>
          </div>

          <button
            type="button"
            className="mt-4 ml-auto cursor-pointer rounded-lg px-6 py-2.5 text-[14px] font-bold text-white transition-colors duration-150 hover:opacity-90"
            style={{ backgroundColor: "#D4A843" }}
          >
            Boka
          </button>
        </div>
      </div>
    </Link>
  )
}
