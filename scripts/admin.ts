import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL ?? ""
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const CYAN = "\x1b[36m"
const RESET = "\x1b[0m"

function success(msg: string): void { process.stdout.write(`${GREEN}✓${RESET} ${msg}\n`) }
function error(msg: string): void { process.stderr.write(`${RED}✗${RESET} ${msg}\n`) }
function info(msg: string): void { process.stdout.write(`${CYAN}→${RESET} ${msg}\n`) }

async function list(): Promise<void> {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const categories = await prisma.accommodationCategory.findMany({
    where: { isActive: true, deletedAt: null },
    include: { inventory: { where: { date: today } } },
    orderBy: { basePricePerNight: "asc" },
  })

  info("Boenden och tillgänglighet idag:\n")
  for (const cat of categories) {
    const inv = cat.inventory[0]
    const available = inv ? String(inv.availableUnits) : "0"
    const total = inv ? String(inv.totalUnits) : "?"
    const priceKr = (cat.basePricePerNight / 100).toFixed(0)
    process.stdout.write(`  ${cat.name}\n    Typ: ${cat.type} | Max gäster: ${String(cat.maxGuests)} | Pris: ${priceKr} kr/natt\n    Tillgängligt idag: ${available}/${total} enheter\n\n`)
  }
  success(`${String(categories.length)} boenden hittades`)
}

async function setAvailability(name: string, units: number): Promise<void> {
  const cat = await prisma.accommodationCategory.findFirst({ where: { name, deletedAt: null } })
  if (!cat) { error(`Boendet "${name}" kunde inte hittas`); process.exit(1) }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const result = await prisma.inventory.updateMany({ where: { categoryId: cat.id, date: { gte: today } }, data: { availableUnits: units } })
  success(`Satte availableUnits=${String(units)} för "${name}" på ${String(result.count)} datum`)
}

async function setPrice(name: string, priceInKronor: number): Promise<void> {
  const cat = await prisma.accommodationCategory.findFirst({ where: { name, deletedAt: null } })
  if (!cat) { error(`Boendet "${name}" kunde inte hittas`); process.exit(1) }
  const priceInOre = Math.round(priceInKronor * 100)
  await prisma.accommodationCategory.update({ where: { id: cat.id }, data: { basePricePerNight: priceInOre } })
  success(`Uppdaterade pris för "${name}" till ${String(priceInKronor)} kr (${String(priceInOre)} ören)`)
}

async function reset(): Promise<void> {
  info("Rensar befintlig data...")
  await prisma.paymentEvent.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.reservationAddon.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.ratePlanAddon.deleteMany()
  await prisma.categoryRatePlan.deleteMany()
  await prisma.categoryAddon.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.ratePlan.deleteMany()
  await prisma.addon.deleteMany()
  await prisma.accommodationCategory.deleteMany()
  success("Data rensad. Kör seed...")
  const { execSync } = await import("child_process")
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" })
  success("Reset klar!")
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0]
  switch (command) {
    case "list": await list(); break
    case "set-availability": {
      const name = args[1]; const units = Number(args[2])
      if (!name || isNaN(units)) { error("Användning: set-availability <namn> <antal>"); process.exit(1) }
      await setAvailability(name, units); break
    }
    case "set-price": {
      const name = args[1]; const price = Number(args[2])
      if (!name || isNaN(price)) { error("Användning: set-price <namn> <prisIKronor>"); process.exit(1) }
      await setPrice(name, price); break
    }
    case "reset": await reset(); break
    default:
      info("Admin CLI — kommandon:\n\n  list\n  set-availability <namn> <antal>\n  set-price <namn> <prisIKronor>\n  reset\n")
      break
  }
}

main()
  .catch((err: unknown) => { error(err instanceof Error ? err.message : String(err)); process.exit(1) })
  .finally(() => { void prisma.$disconnect() })
