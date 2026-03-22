import { Icon } from "@/components/ui/icon"
import { H3, BODY } from "@/lib/typography"
import { cn } from "@/lib/utils"

const TRUST_ITEMS = [
  {
    icon: "verified_user",
    title: "Säker bokning",
    description:
      "Din betalning är skyddad och bekräftelse skickas direkt till din e-post.",
  },
  {
    icon: "schedule",
    title: "Bekräftelse direkt",
    description:
      "Du får din bokningsbekräftelse direkt efter genomförd betalning.",
  },
  {
    icon: "headset_mic",
    title: "Vi finns här för dig",
    description:
      "Kontakta oss om du har frågor om din bokning eller vistelse.",
  },
] as const

export function TrustSection(): React.ReactElement {
  return (
    <section className="mx-auto w-full max-w-[1250px] px-4 py-12 pb-[400px] md:px-8 md:py-16 md:pb-[400px]">
      <div className="flex flex-col divide-y divide-slate-200 md:flex-row md:divide-x md:divide-y-0">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex flex-col items-center px-6 py-8 text-center md:flex-1 md:py-0"
          >
            <Icon name={item.icon} size={32} className="mb-4 text-emerald-600" />
            <h3 className={cn(H3, "mb-2 text-[#202020]")}>{item.title}</h3>
            <p className={cn(BODY, "text-[#6b6b6b]")}>{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
