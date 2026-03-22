import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { successResponse, handleRouteError } from "@/lib/api/response"
import { logger } from "@/lib/utils/logger"

const CATEGORIES = [
  { name: "Hotell 1-4 personer", type: "HOTEL" as const, maxGuests: 4, basePricePerNight: 149900, shortDescription: "Hotellboende med frukostbuffé och slutstädning för upp till fyra personer.", longDescription: "Hotellboende där frukostbuffé och slutstädning ingår för upp till fyra personer i en utav våra större lägenheter. Den är uppdelad på två våningar med en tillhörande terrass med utemöbler utanför. På nedre våningen finns ett fullt utrustat kök, matplats, soffa, TV och en toalett med dusch. På övre våningen finns det två sovrum med två sängar i varje rum. I priset ingår frukostbuffé, bäddade sängar och handdukar, samt slutstädning vid avresa.", facilities: ["frukost", "städning", "wifi", "kök", "tv", "terrass"], units: 4, imageUrls: ["https://images.bookvisit.com/img/ce9cac03-0b03-4a86-b247-ea16a0eed91c.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/de254c6f-6573-402c-8336-b44c055e039f.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/a34614c0-97db-446a-8fb6-bfb83bff3140.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/9e4a33e8-6f87-43b9-a5be-0b1f67167dec.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/dbd71eda-f97e-41d2-8aa1-d42f7317bfde.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/76175914-f417-473d-81ba-f3db7553c8bf.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly"] },
  { name: "Enkelrum Hotell", type: "HOTEL" as const, maxGuests: 1, basePricePerNight: 99900, shortDescription: "Bekvämt hotellboende med frukost och städning.", longDescription: "Vårt hotellboende ger dig högsta komfort och ett bekvämt boende. En enkelsäng finns en trappa upp medan nedre plan består av ett fullutrustat kök med soffa, badrum samt möblerad uteplats. I priset ingår frukostbuffé, bäddad säng, handdukar samt städning efter avresa. Frukosten serveras på restaurang Nisses Bodega", facilities: ["frukost", "städning", "wifi", "kök", "uteplats"], units: 6, imageUrls: ["https://images.bookvisit.com/img/fba2b9e9-9dda-45ba-9cc7-062c70b89e37.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/2731805e-5a8a-45cb-ae70-f3fbddff2d74.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/6334e930-000e-4e7e-a0de-c6626fe00d38.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/7110e977-83a1-45e8-bf25-53896a7a0810.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/2d1ede1c-2700-44df-9ed7-093a94376be4.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly"] },
  { name: "Stuga 1-6 personer", type: "CABIN" as const, maxGuests: 6, basePricePerNight: 179900, shortDescription: "Rymlig stuga med kök och uteplats.", longDescription: "Stugan är utrustad med komplett kök, badrum. I sovrummet finns en dubbelsäng och en våningssäng. I vardagsrummet finns en bäddsoffa. Uteplats med utemöbler finns också. Husdjur är tillåtna. (Stuga 1-2). Denna stuga är självhushåll, det ingår inte lakan och handdukar, frukost eller slutstädning. Köp gärna till det som tillägg! Det ingår en parkering per stuga.", facilities: ["kök", "badrum", "uteplats", "parkering", "husdjur"], units: 2, imageUrls: ["https://images.bookvisit.com/img/21534197-2fa1-4b7c-8f09-64d980842325.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/7446fed8-fc9a-463a-9159-0573e9f3c8ca.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/9d92f1a8-fc6b-4b22-bd8f-833a38714d94.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly"] },
  { name: "Campingstuga", type: "CABIN" as const, maxGuests: 2, basePricePerNight: 69900, shortDescription: "Liten campingstuga med altan.", longDescription: "Den lilla campingstugan på 10 kvm för max två vuxna, alternativ två vuxna och ett barn. Den är utrustad med kylskåp, kaffebryggare, micro, köksutrustning, porslin, bestick och TV. Diskmedel, trasa & diskhandduk finns i stugan, samt kuddar och täcken. I angränsande servicehus finns kök, toalett och dusch. Sover gör man i en bäddsoffa och på en nedfällbar brits som klarar max 50 kilo. Utanför stugan finns en liten altan med utemöbler. Husdjur är tillåtna.", facilities: ["kylskåp", "micro", "tv", "altan", "husdjur"], units: 4, imageUrls: ["https://images.bookvisit.com/img/351b8d3d-cc09-49cf-8577-8fe483be95d7.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/3b51e91a-be10-4c86-8583-143b7b657f37.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/f261c6c3-b4f9-4412-9118-99ac105b727a.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/33c9fbc5-c7b9-410b-90c9-c0b5db81a184.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly"] },
  { name: "Camping 8 m Södra", type: "CAMPING" as const, maxGuests: 6, basePricePerNight: 39900, shortDescription: "Campingtomt 90-100 kvm med el.", longDescription: "Campingtomt på ca 90-100 kvm med el 10 ampere. Främst avsedd för husvagn med förtält, samt passar väldigt bra för enbart tält och bil. Max längd inkl. drag på ekipaget är 8 m då säkerhetsavstånd på 2 meter bak mot häcken skall tillgodoses. Belägen på södra delen av campingen i närheten av östra servicehuset.", facilities: ["el", "servicehus", "parkering"], units: 10, imageUrls: ["https://images.bookvisit.com/img/5e1f2e0c-e882-462b-8a12-e034e4642367.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/6265892a-12db-4a01-a3e8-1897ac22b0ff.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/c6661345-a8cc-44be-aa05-0e63a2b23f09.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/45695001-2611-4fc8-b0e5-e34b2c1e88e8.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly"] },
  { name: "Husbil 10 m", type: "CAMPING" as const, maxGuests: 4, basePricePerNight: 44900, shortDescription: "Husbiisplats för max 10 m.", longDescription: "Denna platsen är gjord enbart för husbil med markis som är max 10 m långa. Platsen är belägen på norra delen av anläggningen passar för sena ankomster och enstaka nätter. Norra servicehuset är närmaste. Halva platsen är grusad, endast liten del är av gräs. Den ligger nära järnvägen.", facilities: ["el", "servicehus"], units: 5, imageUrls: ["https://images.bookvisit.com/img/c1262edd-5ab9-4e9f-82c2-632eb2ab2ed5.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/d1d36060-f387-4979-9cd0-0e106b09e087.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/50b5a96c-06a2-41db-a248-190add36165f.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/f0008a6f-789c-4ea5-a702-79bcc1cafa20.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly"] },
  { name: "Husvagn 9 m Premium", type: "CAMPING" as const, maxGuests: 6, basePricePerNight: 54900, shortDescription: "Premium husvagnstomt med vatten och avlopp.", longDescription: "Våra finaste husvagnstomter på ca 100 kvm med el 16 ampere samt vatten och avlopp. Platsen är avsedd för husvagn med förtält, har hårdgjord yta för enkel uppställning av vagnen och konstgräs under förtältet. Maxlängd inkl. drag på ekipaget är 9 m. Premiumplatsen är belägen centralt på campingen.", facilities: ["el", "vatten", "avlopp", "servicehus", "hårdgjord"], units: 4, imageUrls: ["https://images.bookvisit.com/img/5aa024d4-b3f7-4d1d-9f0d-c40237c8c929.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/20416895-a445-4f60-8a8d-04efc13f8978.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/4562110c-c5e4-45e9-a069-3db971370423.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/0254ceb5-86a3-432e-86d7-2c55854fa961.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly"] },
  { name: "Husbil 7 m", type: "CAMPING" as const, maxGuests: 4, basePricePerNight: 39900, shortDescription: "Husbiisplats för max 7 m.", longDescription: "Platsen passar för husbil med markis, maxlängd på husbil är 7 m. Platserna har hårdgjord yta där husbilen ställs. Det ingår el 10 ampere. De flesta platsen är belägna på södra delen av anläggningen och nära till det mesta. Östra och Södra servicehuset är närmast.", facilities: ["el", "servicehus", "hårdgjord"], units: 8, imageUrls: ["https://images.bookvisit.com/img/ae3c30a7-5635-415a-bc27-29b73f343f91.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/42946f58-dc2f-4ff5-9e71-ca1fc15fba6d.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/545600be-67c0-4c5e-a0fc-9570d77f9353.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly", "https://images.bookvisit.com/img/ef459061-5ee0-4385-b277-3df5a9dead4d.jpg?maxwidth=1000&maxheight=1000&scale=downscaleonly"] },
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

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export async function POST(): Promise<Response> {
  try {
    logger.info("admin.seedReset.start")

    // Clear all data
    await db.paymentEvent.deleteMany()
    await db.payment.deleteMany()
    await db.reservationAddon.deleteMany()
    await db.booking.deleteMany()
    await db.reservation.deleteMany()
    await db.ratePlanAddon.deleteMany()
    await db.categoryRatePlan.deleteMany()
    await db.categoryAddon.deleteMany()
    await db.inventory.deleteMany()
    await db.ratePlan.deleteMany()
    await db.addon.deleteMany()
    await db.accommodationCategory.deleteMany()

    // Seed categories
    const catMap = new Map<string, string>()
    for (const cat of CATEGORIES) {
      const result = await db.accommodationCategory.create({
        data: { name: cat.name, shortDescription: cat.shortDescription, longDescription: cat.longDescription, type: cat.type, imageUrls: cat.imageUrls, facilities: cat.facilities, maxGuests: cat.maxGuests, basePricePerNight: cat.basePricePerNight },
      })
      catMap.set(cat.name, result.id)
    }

    // Seed rate plans
    const rpMap = new Map<string, string>()
    for (const rp of RATE_PLANS) {
      const result = await db.ratePlan.create({
        data: { name: rp.name, description: rp.description, cancellationPolicy: rp.cancellationPolicy, priceRule: rp.priceRule, priceAmount: rp.priceAmount, sortOrder: rp.sortOrder },
      })
      rpMap.set(rp.name, result.id)
    }

    // Link all rate plans to all categories
    for (const catId of catMap.values()) {
      for (const rpId of rpMap.values()) {
        await db.categoryRatePlan.create({ data: { categoryId: catId, ratePlanId: rpId } })
      }
    }

    // Seed addons
    const addonMap = new Map<string, string>()
    for (const addon of ADDONS) {
      const result = await db.addon.create({ data: { name: addon.name, description: addon.description, price: addon.price } })
      addonMap.set(addon.name, result.id)
    }

    // Link addons to categories
    for (const [catName, addonNames] of Object.entries(ADDON_LINKS)) {
      const catId = catMap.get(catName)
      if (!catId) continue
      for (const addonName of addonNames) {
        const addonId = addonMap.get(addonName)
        if (!addonId) continue
        await db.categoryAddon.create({ data: { categoryId: catId, addonId } })
      }
    }

    // Seed inventory (90 days)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const cat of CATEGORIES) {
      const catId = catMap.get(cat.name)
      if (!catId) continue
      for (let i = 0; i < 90; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        const priceOverride = isWeekend(date) ? Math.round(cat.basePricePerNight * 1.2) : null
        await db.inventory.create({ data: { categoryId: catId, date, totalUnits: cat.units, availableUnits: cat.units, priceOverride } })
      }
    }

    logger.info("admin.seedReset.complete")
    revalidatePath("/")
    revalidatePath("/search")
    revalidatePath("/admin")

    return successResponse({ reset: true, message: "Testdata återställd" })
  } catch (error) {
    return handleRouteError(error)
  }
}
