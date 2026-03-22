import { HeroSlider } from "@/components/booking/hero-slider"
import { TrustSection } from "@/components/booking/trust-section"

export default function HomePage(): React.ReactElement {
  return (
    <main>
      {/* Hero slider */}
      <div className="w-full">
        <div className="mx-auto max-w-[1250px] px-4 md:px-8">
          <HeroSlider />
        </div>
      </div>

      {/* Trust section */}
      <TrustSection />
    </main>
  )
}
