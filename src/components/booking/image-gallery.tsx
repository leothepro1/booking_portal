import Image from "next/image"
import { Icon } from "@/components/ui/icon"

interface ImageGalleryProps {
  images: string[]
  name: string
}

const GALLERY_SLOTS = 3

export function ImageGallery({ images, name }: ImageGalleryProps): React.ReactElement {
  const slots = images.slice(0, GALLERY_SLOTS)

  return (
    <div className="flex gap-1" style={{ height: 420 }}>
      {/* Large hero image — 63% */}
      <div className="shimmer relative overflow-hidden rounded-l-xl" style={{ width: "63%" }}>
        <GalleryImage
          src={slots[0]}
          alt={name}
          sizes="(max-width: 768px) 100vw, 63vw"
          priority
        />
      </div>

      {/* Two stacked images — 37% */}
      <div className="flex flex-col gap-1 overflow-hidden rounded-r-xl" style={{ width: "37%" }}>
        <div className="shimmer relative flex-1 overflow-hidden">
          <GalleryImage
            src={slots[1]}
            alt={`${name} bild 2`}
            sizes="(max-width: 768px) 100vw, 37vw"
          />
        </div>
        <div className="shimmer relative flex-1 overflow-hidden">
          <GalleryImage
            src={slots[2]}
            alt={`${name} bild 3`}
            sizes="(max-width: 768px) 100vw, 37vw"
          />
          {/* "Show all" badge if there are more images */}
          {images.length > GALLERY_SLOTS && (
            <button
              type="button"
              className="absolute bottom-3 right-3 z-[2] flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-[13px] font-semibold text-[#202020] shadow-sm backdrop-blur-sm transition-colors duration-150 hover:bg-white"
            >
              <Icon name="grid_view" size={16} />
              Visa alla {String(images.length)} bilder
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Single gallery cell ────────────────────────────────────
function GalleryImage({
  src,
  alt,
  sizes,
  priority,
}: {
  src: string | undefined
  alt: string
  sizes: string
  priority?: boolean | undefined
}): React.ReactElement {
  if (!src) {
    return (
      <div className="flex size-full items-center justify-center bg-[#f4f4f6]">
        <Icon name="image" size={32} className="text-[#d4d5d9]" />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="relative z-[1] object-cover transition-transform duration-300 hover:scale-[1.03]"
      sizes={sizes}
      {...(priority ? { priority: true } : {})}
    />
  )
}
