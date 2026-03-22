"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"

interface AccommodationActionsProps {
  id: string
  isActive: boolean
}

export function AccommodationActions({ id, isActive }: AccommodationActionsProps): React.ReactElement {
  const router = useRouter()

  async function handleToggle(): Promise<void> {
    await fetch(`/api/admin/accommodations/${id}/toggle`, { method: "POST" })
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/accommodations/${id}`}
        className="rounded-md bg-[#f4f4f6] px-3 py-1.5 text-xs font-medium text-[#202020] transition-colors hover:bg-[#e5e5e9]"
      >
        Redigera
      </Link>
      <button
        type="button"
        onClick={() => void handleToggle()}
        className="cursor-pointer rounded-md bg-[#f4f4f6] px-3 py-1.5 text-xs font-medium text-[#202020] transition-colors hover:bg-[#e5e5e9]"
      >
        {isActive ? "Inaktivera" : "Aktivera"}
      </button>
    </div>
  )
}
