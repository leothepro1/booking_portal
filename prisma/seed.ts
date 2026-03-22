import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL ?? ""
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

interface CategorySeed {
  name: string
  type: "CAMPING" | "APARTMENT" | "HOTEL" | "CABIN"
  maxGuests: number
  basePricePerNight: number
  shortDescription: string
  longDescription: string
  facilities: string[]
  units: number
  imageUrls: string[]
}

const CATEGORIES: CategorySeed[] = [
  { name: "Hotell 1-4 personer", type: "HOTEL", maxGuests: 4, basePricePerNight: 149900, shortDescription: "Hotellboende med frukostbuffé och slutstädning.", longDescription: "Hotellboende där frukostbuffé och slutstädning ingår för upp till fyra personer.", facilities: ["frukost", "städning", "wifi", "kök", "tv", "terrass"], units: 4, imageUrls: [
    "https://images.bookvisit.com/img/ce9cac03-0b03-4a86-b247-ea16a0eed91c.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly",
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop",
  ] },
  { name: "Enkelrum Hotell", type: "HOTEL", maxGuests: 1, basePricePerNight: 99900, shortDescription: "Bekvämt hotellboende med frukost.", longDescription: "Vårt hotellboende ger dig högsta komfort.", facilities: ["frukost", "städning", "wifi", "kök"], units: 6, imageUrls: [
    "https://images.bookvisit.com/img/fba2b9e9-9dda-45ba-9cc7-062c70b89e37.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop",
  ] },
  { name: "Stuga 1-6 personer", type: "CABIN", maxGuests: 6, basePricePerNight: 179900, shortDescription: "Rymlig stuga med kök och uteplats.", longDescription: "Stugan är utrustad med komplett kök, badrum.", facilities: ["kök", "badrum", "uteplats", "parkering"], units: 2, imageUrls: [
    "https://images.bookvisit.com/img/21534197-2fa1-4b7c-8f09-64d980842325.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly",
    "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1432303492674-642e9d0944b2?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=600&fit=crop",
  ] },
  { name: "Campingstuga", type: "CABIN", maxGuests: 2, basePricePerNight: 69900, shortDescription: "Liten campingstuga med altan.", longDescription: "Den lilla campingstugan på 10 kvm.", facilities: ["kylskåp", "micro", "tv", "altan"], units: 4, imageUrls: [
    "https://images.bookvisit.com/img/351b8d3d-cc09-49cf-8577-8fe483be95d7.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly",
    "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1534187886935-1e1236e856c3?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
  ] },
  { name: "Camping 8 m Södra", type: "CAMPING", maxGuests: 6, basePricePerNight: 39900, shortDescription: "Campingtomt 90-100 kvm med el.", longDescription: "Campingtomt på ca 90-100 kvm med el 10 ampere.", facilities: ["el", "servicehus", "parkering"], units: 10, imageUrls: [
    "https://images.bookvisit.com/img/5e1f2e0c-e882-462b-8a12-e034e4642367.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly",
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1525811902-f2342640856e?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1537905569824-f89f14cceb68?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1445308394109-4ec2920981b1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=800&h=600&fit=crop",
  ] },
  { name: "Husbil 10 m", type: "CAMPING", maxGuests: 4, basePricePerNight: 44900, shortDescription: "Husbiisplats för max 10 m.", longDescription: "Platsen är gjord enbart för husbil.", facilities: ["el", "servicehus"], units: 5, imageUrls: [
    "https://images.bookvisit.com/img/c1262edd-5ab9-4e9f-82c2-632eb2ab2ed5.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly",
    "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1533575770077-052fa2c609fc?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1543731068-7e0f5beff43a?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1527786356703-4b100091cd2c?w=800&h=600&fit=crop",
  ] },
  { name: "Husvagn 9 m Premium", type: "CAMPING", maxGuests: 6, basePricePerNight: 54900, shortDescription: "Premium husvagnstomt med vatten och avlopp.", longDescription: "Våra finaste husvagnstomter.", facilities: ["el", "vatten", "avlopp", "servicehus"], units: 4, imageUrls: [
    "https://images.bookvisit.com/img/5aa024d4-b3f7-4d1d-9f0d-c40237c8c929.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly",
    "https://images.unsplash.com/photo-1571863533956-01c88e496cba?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1596649299486-4cdea56fd59d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1414016642493-13571d76b22c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1506197603052-3cc9c3a209c8?w=800&h=600&fit=crop",
  ] },
  { name: "Husbil 7 m", type: "CAMPING", maxGuests: 4, basePricePerNight: 39900, shortDescription: "Husbiisplats för max 7 m.", longDescription: "Platsen passar för husbil med markis.", facilities: ["el", "servicehus", "hårdgjord"], units: 8, imageUrls: [
    "https://images.bookvisit.com/img/ae3c30a7-5635-415a-bc27-29b73f343f91.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly",
    "https://images.unsplash.com/photo-1534187886935-1e1236e856c3?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1470770841497-7b3202e2cd72?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&h=600&fit=crop",
  ] },
]

const RATE_PLANS = [
  { name: "Standardpris", cancellationPolicy: "FLEXIBLE" as const, priceRule: "BASE" as const, priceAmount: 0, description: "Gratis avbokning fram till 24 timmar före incheckning.", sortOrder: 1 },
  { name: "Bästa pris — ej återbetalningsbart", cancellationPolicy: "NON_REFUNDABLE" as const, priceRule: "MULTIPLIER" as const, priceAmount: 85, description: "Spara 15% — kan ej avbokas eller ändras.", sortOrder: 2 },
]

const ADDONS = [
  { name: "Frukostpaket", price: 14900, description: "Nylagad frukost serveras vid receptionen 08:00–10:00." },
  { name: "Parkering", price: 9900, description: "Garanterad parkeringsplats inom anläggningen." },
  { name: "Lakan & Handdukar", price: 19900, description: "Set med lakan, örngott och två handdukar per person." },
  { name: "Sen utcheckning (kl 14:00)", price: 24900, description: "Förläng din morgon — checka ut kl 14:00 istället för 11:00." },
  { name: "Slutstädning", price: 39900, description: "Vi städar boendet efter din avresa." },
]

const ADDON_LINKS: Record<string, string[]> = {
  "Hotell 1-4 personer": ["Parkering"],
  "Enkelrum Hotell": ["Parkering"],
  "Stuga 1-6 personer": ["Frukostpaket", "Lakan & Handdukar", "Slutstädning", "Sen utcheckning (kl 14:00)"],
  "Campingstuga": ["Lakan & Handdukar", "Slutstädning", "Sen utcheckning (kl 14:00)"],
  "Camping 8 m Södra": ["Parkering"],
}

function isWeekend(date: Date): boolean { return date.getDay() === 0 || date.getDay() === 6 }

async function main(): Promise<void> {
  process.stdout.write("→ Seeding categories...\n")
  const catMap = new Map<string, string>()
  for (const cat of CATEGORIES) {
    const result = await prisma.accommodationCategory.upsert({
      where: { id: (await prisma.accommodationCategory.findFirst({ where: { name: cat.name } }))?.id ?? "00000000-0000-0000-0000-000000000000" },
      update: { shortDescription: cat.shortDescription, longDescription: cat.longDescription, type: cat.type, maxGuests: cat.maxGuests, basePricePerNight: cat.basePricePerNight, imageUrls: cat.imageUrls, facilities: cat.facilities, isActive: true, deletedAt: null },
      create: { name: cat.name, shortDescription: cat.shortDescription, longDescription: cat.longDescription, type: cat.type, imageUrls: cat.imageUrls, facilities: cat.facilities, maxGuests: cat.maxGuests, basePricePerNight: cat.basePricePerNight },
    })
    catMap.set(cat.name, result.id)
    process.stdout.write(`  ✓ ${cat.name}\n`)
  }

  process.stdout.write("→ Seeding rate plans...\n")
  const rpMap = new Map<string, string>()
  for (const rp of RATE_PLANS) {
    const result = await prisma.ratePlan.upsert({
      where: { id: (await prisma.ratePlan.findFirst({ where: { name: rp.name } }))?.id ?? "00000000-0000-0000-0000-000000000000" },
      update: { description: rp.description, cancellationPolicy: rp.cancellationPolicy, priceRule: rp.priceRule, priceAmount: rp.priceAmount, sortOrder: rp.sortOrder },
      create: { name: rp.name, description: rp.description, cancellationPolicy: rp.cancellationPolicy, priceRule: rp.priceRule, priceAmount: rp.priceAmount, sortOrder: rp.sortOrder },
    })
    rpMap.set(rp.name, result.id)
    process.stdout.write(`  ✓ ${rp.name}\n`)
  }

  process.stdout.write("→ Linking rate plans to categories...\n")
  for (const catId of catMap.values()) {
    for (const rpId of rpMap.values()) {
      await prisma.categoryRatePlan.upsert({
        where: { categoryId_ratePlanId: { categoryId: catId, ratePlanId: rpId } },
        update: {},
        create: { categoryId: catId, ratePlanId: rpId },
      })
    }
  }

  process.stdout.write("→ Seeding addons...\n")
  const addonMap = new Map<string, string>()
  for (const addon of ADDONS) {
    const result = await prisma.addon.upsert({
      where: { id: (await prisma.addon.findFirst({ where: { name: addon.name } }))?.id ?? "00000000-0000-0000-0000-000000000000" },
      update: { description: addon.description, price: addon.price },
      create: { name: addon.name, description: addon.description, price: addon.price },
    })
    addonMap.set(addon.name, result.id)
  }

  for (const [catName, addonNames] of Object.entries(ADDON_LINKS)) {
    const catId = catMap.get(catName)
    if (!catId) continue
    for (const addonName of addonNames) {
      const addonId = addonMap.get(addonName)
      if (!addonId) continue
      await prisma.categoryAddon.upsert({
        where: { categoryId_addonId: { categoryId: catId, addonId } },
        update: {},
        create: { categoryId: catId, addonId },
      })
    }
  }

  process.stdout.write("→ Seeding inventory (90 days)...\n")
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (const cat of CATEGORIES) {
    const catId = catMap.get(cat.name)
    if (!catId) continue
    for (let i = 0; i < 90; i++) {
      const date = new Date(today); date.setDate(date.getDate() + i)
      const priceOverride = isWeekend(date) ? Math.round(cat.basePricePerNight * 1.2) : null
      await prisma.inventory.upsert({
        where: { categoryId_date: { categoryId: catId, date } },
        update: { totalUnits: cat.units, availableUnits: cat.units, priceOverride },
        create: { categoryId: catId, date, totalUnits: cat.units, availableUnits: cat.units, priceOverride },
      })
    }
    process.stdout.write(`  ✓ ${cat.name}: 90 inventory rows\n`)
  }

  process.stdout.write("✓ Seed complete!\n")
}

main()
  .catch((error: unknown) => { process.stderr.write(`✗ Seed failed: ${error instanceof Error ? error.message : String(error)}\n`); process.exit(1) })
  .finally(() => { void prisma.$disconnect() })
