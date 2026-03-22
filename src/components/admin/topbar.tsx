"use client"

import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { useState } from "react"

export function AdminTopbar(): React.ReactElement {
  const [resetting, setResetting] = useState(false)

  async function handleReset(): Promise<void> {
    if (!confirm("Återställ all testdata? Bokningar och ändringar raderas.")) return
    setResetting(true)
    try {
      await fetch("/api/admin/seed-reset", { method: "POST" })
      window.location.reload()
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="border-b border-[#e5e7eb] bg-white">
      <div className="mx-auto flex h-14 max-w-[1250px] items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#202020]">Admin</span>
          <span className="rounded-md bg-[#f4f4f6] px-2 py-0.5 text-[10px] font-semibold text-[#6b6b6b]">
            Mock PMS
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={resetting}
            className="cursor-pointer text-xs text-[#9b9b9b] transition-colors hover:text-red-500"
          >
            {resetting ? "Återställer..." : "Återställ data"}
          </button>
          <Link href="/" className="flex items-center gap-1 text-xs text-[#6b6b6b] transition-colors hover:text-[#202020]">
            <Icon name="arrow_back" size={16} />
            Portalen
          </Link>
        </div>
      </div>
    </div>
  )
}
