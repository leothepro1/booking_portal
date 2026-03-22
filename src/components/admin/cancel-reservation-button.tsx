"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface CancelReservationButtonProps {
  id: string
}

export function CancelReservationButton({ id }: CancelReservationButtonProps): React.ReactElement {
  const router = useRouter()

  async function handleCancel(): Promise<void> {
    if (!confirm("Är du säker? Detta kan inte ångras.")) return
    const res = await fetch(`/api/admin/reservations/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Reservation avbokad")
      router.refresh()
    } else {
      toast.error("Misslyckades")
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCancel()}
      className="cursor-pointer rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
    >
      Avboka
    </button>
  )
}
