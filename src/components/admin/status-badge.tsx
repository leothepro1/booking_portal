import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  LOCKED: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-red-50 text-red-600",
  EXPIRED: "bg-red-50 text-red-600",
  CAPTURED: "bg-emerald-50 text-emerald-700",
  AUTHORIZED: "bg-amber-50 text-amber-700",
  REFUNDED: "bg-red-50 text-red-600",
}

interface StatusBadgeProps {
  status: string
  className?: string | undefined
}

export function StatusBadge({ status, className }: StatusBadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-500",
        className
      )}
    >
      {status}
    </span>
  )
}
