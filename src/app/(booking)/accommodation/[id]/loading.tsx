export default function AccommodationLoading(): React.ReactElement {
  return (
    <div className="mx-auto w-full max-w-[1250px] px-4 pt-6 md:px-8">
      {/* Gallery skeleton — matches ImageGallery layout exactly */}
      <div className="flex flex-col gap-1">
        {/* Top row */}
        <div className="flex gap-1" style={{ height: 420 }}>
          <div className="shimmer rounded-l-xl" style={{ width: "63%" }} />
          <div className="flex flex-col gap-1 overflow-hidden rounded-r-xl" style={{ width: "37%" }}>
            <div className="shimmer flex-1" />
            <div className="shimmer flex-1" />
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex gap-1" style={{ height: 180 }}>
          <div className="shimmer flex-1" style={{ borderRadius: "0 0 0 12px" }} />
          <div className="shimmer flex-1" />
          <div className="shimmer flex-1" />
          <div className="shimmer flex-1" style={{ borderRadius: "0 0 12px 0" }} />
        </div>
      </div>

      {/* Title + description skeleton */}
      <div className="py-8">
        <div className="shimmer h-8 w-72 rounded-md" />
        <div className="shimmer mt-3 h-5 w-full max-w-[600px] rounded-md" />
      </div>
    </div>
  )
}
