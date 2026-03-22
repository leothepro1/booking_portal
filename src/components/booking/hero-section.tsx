import Image from "next/image"
import { cn } from "@/lib/utils"
import { DISPLAY_1, BODY_LG } from "@/lib/typography"

const HERO_IMAGE_URL =
  "https://forever.travel-assets.com/flex/flexmanager/images/2025/08/21/PD2_HCOM_hero_cr2.avif?impolicy=fcrop&w=1920&h=400&q=medium"

const SITE_NAME = "Naturbyn"
const HERO_SUBTITLE = "Boka din vistelse direkt"
const HERO_ALT = "Naturskön vy över anläggningen"

interface HeroSectionProps {
  children?: React.ReactNode
}

export function HeroSection({ children }: HeroSectionProps): React.ReactElement {
  return (
    <section className="relative">
      <div className="relative h-[400px] md:h-[520px] w-full overflow-hidden">
        <Image
          src={HERO_IMAGE_URL}
          alt={HERO_ALT}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <h1
            className={cn(DISPLAY_1, "text-white")}
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
          >
            {SITE_NAME}
          </h1>
          <p className={cn(BODY_LG, "mt-3 text-white/80")}>
            {HERO_SUBTITLE}
          </p>
        </div>
      </div>

      {children && (
        <div className="relative z-10 mx-auto max-w-5xl px-4 md:-mt-10">
          {children}
        </div>
      )}
    </section>
  )
}
