"use client"

import { useState, useCallback, useRef } from "react"
import Image from "next/image"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { DISPLAY_2, BODY_LG, UI_LG } from "@/lib/typography"

// ─── Data ───────────────────────────────────────────────────

interface HeroSlide {
  id: string
  title: string
  body: string
  buttonText: string
  buttonHref: string
  imageUrl: string
  imageAlt: string
}

const SLIDES: HeroSlide[] = [
  {
    id: "vardagscamp",
    title: "En bättre vardag Camping",
    body: "Ett paket för er som vill njuta av lite lyx mitt i veckan med frukostbuffé, spaentré till Varbergs Kusthotell och fri cykelhyra.",
    buttonText: "Boka paket",
    buttonHref: "/search",
    imageUrl: "https://images.bookvisit.com/img/0254ceb5-86a3-432e-86d7-2c55854fa961.jpg?maxwidth=900&maxheight=700&scale=downscaleonly&scale=downscaleonly&anchor=MiddleCenter&anchor=MiddleCenter&sharpen=0.6",
    imageAlt: "En bättre vardag camping",
  },
  {
    id: "revyn",
    title: "Falkenbergsrevyn Hotellpaket",
    body: "31 Januari (FULLT) | 21 februari | 21 mars | Skratt, show & smakupplevelser – allt i ett paket!\nBoka en helg fylld av nöjen med Falkenbergsrevyn, boende, mat, quiz och buss – oavsett om du bor på hotell eller i husbil. Allt är klart, det är bara att hänga med!",
    buttonText: "Boka paket",
    buttonHref: "/search",
    imageUrl: "https://images.bookvisit.com/img/bdb478d1-11a2-4c73-b214-5b559f8a6407.jpg?maxwidth=900&maxheight=700&scale=downscaleonly&scale=downscaleonly&anchor=MiddleCenter&anchor=MiddleCenter&sharpen=0.6",
    imageAlt: "Falkenbergsrevyn hotellpaket",
  },
]

const ARIA = {
  SLIDER: "Destinationsbilder",
  PREV: "Föregående destination",
  NEXT: "Nästa destination",
  DOTS: "Välj destination",
  DOT_PREFIX: "Destination",
} as const

// ─── Component ──────────────────────────────────────────────

export function HeroSlider(): React.ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < SLIDES.length - 1

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(SLIDES.length - 1, index)))
  }, [])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(SLIDES.length - 1, prev + 1))
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const endX = e.changedTouches[0]?.clientX ?? 0
      const delta = touchStartX.current - endX
      touchStartX.current = null

      if (Math.abs(delta) > 50) {
        if (delta > 0 && canGoNext) goNext()
        if (delta < 0 && canGoPrev) goPrev()
      }
    },
    [canGoNext, canGoPrev, goNext, goPrev]
  )

  return (
    <section
      className="relative w-full"
      aria-label={ARIA.SLIDER}
    >
    <div
      className="relative h-[444px] w-full overflow-hidden rounded-[20px] bg-slate-900"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides track */}
      <div
        className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ transform: `translateX(-${String(currentIndex * 100)}%)` }}
      >
        {SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className="relative h-full w-full shrink-0"
            role="group"
            aria-roledescription="slide"
            aria-label={`${String(index + 1)} av ${String(SLIDES.length)}`}
          >
            {/* Image */}
            <Image
              src={slide.imageUrl}
              alt={slide.imageAlt}
              fill
              className="object-cover"
              priority={index === 0}
              sizes="100vw"
            />

            {/* Gradient overlay — pointer-events-none, behind content via DOM order */}
            <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.65) 30%, rgba(0, 0, 0, 0.1) 65%, transparent 100%)" }} />

            {/* Text content — after gradient in DOM = renders on top */}
            <div className="absolute max-w-[560px]" style={{ left: 42, bottom: 42 }}>
              <h2
                className="mb-3 font-bold text-white"
                style={{ fontSize: 32, textShadow: "none" }}
              >
                {slide.title}
              </h2>
              <p className="mb-6 whitespace-pre-line text-white" style={{ fontSize: 15, lineHeight: "1.35em" }}>
                {slide.body}
              </p>
              <a
                href={slide.buttonHref}
                className="inline-block rounded-md text-[#202020] transition-all duration-200 hover:bg-white"
                style={{ fontSize: 14, fontWeight: 550, padding: "11px 16px", background: "rgba(255, 255, 255, .8)", backdropFilter: "blur(5px)" }}
              >
                {slide.buttonText}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators — inside image area */}
      <div
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2"
        role="tablist"
        aria-label={ARIA.DOTS}
      >
        {SLIDES.map((slide, index) => {
          const isActive = index === currentIndex
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${ARIA.DOT_PREFIX} ${String(index + 1)}`}
              onClick={() => goTo(index)}
              className="h-2 cursor-pointer rounded-full transition-all duration-300"
              style={{
                width: isActive ? 24 : 8,
                backgroundColor: isActive ? "white" : "rgba(255,255,255,0.5)",
              }}
            />
          )
        })}
      </div>
    </div>

      {/* Navigation arrows — centered on container edge, outside overflow */}
      <button
        type="button"
        onClick={goPrev}
        aria-label={ARIA.PREV}
        aria-disabled={!canGoPrev}
        className="absolute left-0 top-1/2 z-10 flex size-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#dadada] bg-white text-[#202020] transition-all duration-300"
        style={{
          boxShadow: "0 0 12px 0 rgba(64,87,109,.07)",
          opacity: canGoPrev ? 1 : 0,
          pointerEvents: canGoPrev ? "auto" : "none",
        }}
      >
        <Icon name="chevron_left" size={24} />
      </button>

      <button
        type="button"
        onClick={goNext}
        aria-label={ARIA.NEXT}
        aria-disabled={!canGoNext}
        className="absolute right-0 top-1/2 z-10 flex size-10 translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#dadada] bg-white text-[#202020] transition-all duration-300"
        style={{
          boxShadow: "0 0 12px 0 rgba(64,87,109,.07)",
          opacity: canGoNext ? 1 : 0,
          pointerEvents: canGoNext ? "auto" : "none",
        }}
      >
        <Icon name="chevron_right" size={24} />
      </button>
    </section>
  )
}
