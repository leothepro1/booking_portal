import { db } from "@/lib/db"
import { formatSEK } from "@/lib/utils/currency"
import { getNights } from "@/lib/utils/dates"
import { Icon } from "@/components/ui/icon"
import { StatusBadge } from "@/components/admin/status-badge"
import { AccommodationActions } from "@/components/admin/accommodation-actions"
import { CancelReservationButton } from "@/components/admin/cancel-reservation-button"
import { startOfDay, startOfWeek } from "date-fns"

const TYPE_LABELS: Record<string, string> = {
  CAMPING: "Campingtomter",
  APARTMENT: "Lägenheter",
  HOTEL: "Hotell",
  CABIN: "Stugor",
}

interface KpiProps { icon: string; iconColor: string; label: string; value: string; sub: string }

function Kpi({ icon, iconColor, label, value, sub }: KpiProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon name={icon} size={20} className={iconColor} />
        <span className="text-xs font-medium text-[#6b6b6b]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#202020]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#9b9b9b]">{sub}</p>
    </div>
  )
}

export default async function AdminPage(): Promise<React.ReactElement> {
  const now = new Date()
  const today = startOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })

  const [
    accommodations,
    todayInventory,
    weekReservations,
    recentReservations,
  ] = await Promise.all([
    db.accommodationCategory.findMany({
      where: { deletedAt: null },
      include: { inventory: { where: { date: today } } },
      orderBy: { basePricePerNight: "asc" },
    }),
    db.inventory.findMany({ where: { date: today } }),
    db.reservation.findMany({
      where: { createdAt: { gte: weekStart }, status: { notIn: ["CANCELLED", "EXPIRED"] } },
    }),
    db.reservation.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { category: true, booking: true },
    }),
  ])

  const activeCount = accommodations.filter((a) => a.isActive).length
  const availableToday = todayInventory.reduce((s, i) => s + i.availableUnits, 0)

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon="cottage" iconColor="text-[#6b6b6b]" label="Aktiva boenden" value={String(activeCount)} sub={`av ${String(accommodations.length)} totalt`} />
        <Kpi icon="event_available" iconColor="text-emerald-600" label="Lediga idag" value={String(availableToday)} sub="enheter" />
        <Kpi icon="receipt_long" iconColor="text-[#207EA9]" label="Denna vecka" value={String(weekReservations.length)} sub="reservationer" />
        <Kpi icon="group" iconColor="text-[#6b6b6b]" label="Boenden" value={String(accommodations.length)} sub="i systemet" />
      </div>

      {/* Accommodations */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">Boenden</h2>
        <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-medium text-[#9b9b9b]">
                <th className="px-4 py-3">Namn</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Pris/natt</th>
                <th className="px-4 py-3">Ledigt idag</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {accommodations.map((acc) => {
                const avail = acc.inventory[0]?.availableUnits ?? 0
                const availColor = avail === 0 ? "text-red-600" : avail <= 2 ? "text-amber-600" : "text-emerald-600"
                return (
                  <tr key={acc.id} className="border-b border-[#e5e7eb] last:border-0">
                    <td className="px-4 py-3 font-medium text-[#202020]">{acc.name}</td>
                    <td className="px-4 py-3 text-[#6b6b6b]">{TYPE_LABELS[acc.type] ?? acc.type}</td>
                    <td className="px-4 py-3 text-[#202020]">{formatSEK(acc.basePricePerNight)}</td>
                    <td className={`px-4 py-3 font-semibold ${availColor}`}>{String(avail)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={acc.isActive ? "CONFIRMED" : "CANCELLED"} />
                    </td>
                    <td className="px-4 py-3">
                      <AccommodationActions id={acc.id} isActive={acc.isActive} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent reservations */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">Senaste reservationer</h2>
        <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          {recentReservations.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#9b9b9b]">Inga reservationer ännu</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-left text-xs font-medium text-[#9b9b9b]">
                  <th className="px-4 py-3">Boende</th>
                  <th className="px-4 py-3">Gäst</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Nätter</th>
                  <th className="px-4 py-3">Belopp</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.map((r) => {
                  const nights = getNights(r.checkIn, r.checkOut)
                  const canCancel = r.status === "LOCKED" || r.status === "PENDING"
                  return (
                    <tr key={r.id} className="border-b border-[#e5e7eb] last:border-0">
                      <td className="px-4 py-3 text-[#202020]">{r.category.name}</td>
                      <td className="px-4 py-3 text-[#6b6b6b]">{r.booking?.guestName ?? "–"}</td>
                      <td className="px-4 py-3 text-[#6b6b6b]">
                        {r.checkIn.toLocaleDateString("sv-SE")} → {r.checkOut.toLocaleDateString("sv-SE")}
                      </td>
                      <td className="px-4 py-3 text-[#6b6b6b]">{String(nights)}</td>
                      <td className="px-4 py-3 text-[#202020]">{r.booking ? formatSEK(r.booking.totalAmount) : "–"}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">{canCancel && <CancelReservationButton id={r.id} />}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
