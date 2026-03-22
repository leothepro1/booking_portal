import { Skeleton } from "@/components/ui/skeleton"

export default function SearchLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <div className="mb-8">
        <Skeleton className="mb-2 h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="mb-1 h-6 w-48" />
            <Skeleton className="mb-4 h-10 w-full" />
            <div className="flex items-end justify-between">
              <Skeleton className="h-4 w-24" />
              <div className="text-right">
                <Skeleton className="mb-1 h-3 w-12" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
