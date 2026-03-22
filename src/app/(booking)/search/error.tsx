"use client"

import { Icon } from "@/components/ui/icon"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { H2, BODY, UI } from "@/lib/typography"

const TEXT = {
  TITLE: "Något gick fel vid sökningen",
  DESCRIPTION: "Vi kunde inte hämta tillgängliga boenden just nu. Försök igen eller gå tillbaka till startsidan.",
  RETRY: "Försök igen",
  BACK: "Tillbaka till söket",
} as const

interface ErrorProps {
  reset: () => void
}

export default function SearchError({ reset }: ErrorProps): React.ReactElement {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
      <Icon name="warning" size={48} className="mb-6 text-amber-500" />
      <h2 className={cn(H2, "mb-2 text-[#202020]")}>{TEXT.TITLE}</h2>
      <p className={cn(BODY, "mb-8 text-[#6b6b6b]")}>{TEXT.DESCRIPTION}</p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={reset}
          className={cn(UI, "cursor-pointer rounded-lg bg-slate-900 px-6 py-3 text-white transition-all duration-200 hover:bg-slate-700")}
        >
          {TEXT.RETRY}
        </button>
        <Link
          href="/"
          className={cn(UI, "rounded-lg border border-slate-200 px-6 py-3 text-[#202020] transition-all duration-200 hover:border-slate-300 hover:bg-slate-50")}
        >
          {TEXT.BACK}
        </Link>
      </div>
    </div>
  )
}
