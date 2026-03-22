import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { MockBookingProvider } from "../src/lib/providers/mock"
import { searchAvailability } from "../src/lib/services/availability.service"
import { initiateBooking, cancelBooking } from "../src/lib/services/booking.service"
import { CircuitBreaker } from "../src/lib/circuit-breaker"

const connectionString = process.env.DATABASE_URL ?? ""
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })
const provider = new MockBookingProvider()

const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const RESET = "\x1b[0m"
let failures = 0

function pass(msg: string): void { process.stdout.write(`${GREEN}✓${RESET} ${msg}\n`) }
function fail(msg: string, err?: unknown): void {
  const detail = err instanceof Error ? err.message : String(err ?? "")
  process.stderr.write(`${RED}✗${RESET} ${msg}${detail ? ` — ${detail}` : ""}\n`)
  failures++
}

async function main(): Promise<void> {
  process.stdout.write("\n=== Provider Contract Validation ===\n\n")

  const cat = await prisma.accommodationCategory.findFirst({ where: { isActive: true, deletedAt: null }, orderBy: { basePricePerNight: "asc" } })
  if (!cat) { fail("Ingen kategori hittades — kör seed först!"); process.exit(1) }

  const ratePlan = await prisma.ratePlan.findFirst({ where: { isActive: true } })
  if (!ratePlan) { fail("Ingen rate plan hittades — kör seed först!"); process.exit(1) }

  const checkIn = new Date(); checkIn.setDate(checkIn.getDate() + 1); checkIn.setHours(0, 0, 0, 0)
  const checkOut = new Date(checkIn); checkOut.setDate(checkOut.getDate() + 2)

  // Test 1: getAvailability
  try {
    const result = await provider.getAvailability({ checkIn, checkOut, guests: 2 })
    if (!Array.isArray(result.categories)) fail("getAvailability: categories not array")
    else if (result.categories.length === 0) fail("getAvailability: 0 categories")
    else pass(`getAvailability: ${String(result.categories.length)} categories, ${String(result.nights)} nights`)
  } catch (err) { fail("getAvailability threw", err) }

  // Test 2: getCategory
  try {
    const result = await provider.getCategory(cat.id)
    if (result.id !== cat.id) fail("getCategory: wrong id")
    else pass(`getCategory: "${result.name}"`)
  } catch (err) { fail("getCategory threw", err) }

  // Test 3: getCategory not found
  try {
    await provider.getCategory("00000000-0000-0000-0000-000000000000")
    fail("getCategory(invalid): should throw")
  } catch (err) {
    if (err instanceof Error && err.name === "AppError") pass("getCategory(invalid): correctly throws")
    else fail("getCategory(invalid): unexpected error", err)
  }

  // Test 4: createReservation
  let reservationId: string | undefined
  try {
    const invBefore = await prisma.inventory.findFirst({ where: { categoryId: cat.id, date: checkIn } })
    const unitsBefore = invBefore?.availableUnits ?? 0
    const res = await provider.createReservation({ categoryId: cat.id, ratePlanId: ratePlan.id, checkIn, checkOut, guests: 2 })
    reservationId = res.id
    const invAfter = await prisma.inventory.findFirst({ where: { categoryId: cat.id, date: checkIn } })
    const unitsAfter = invAfter?.availableUnits ?? 0
    if (unitsAfter !== unitsBefore - 1) fail(`createReservation: units ${String(unitsBefore)} → ${String(unitsAfter)}`)
    else pass(`createReservation: ${res.id}, units ${String(unitsBefore)} → ${String(unitsAfter)}`)
  } catch (err) { fail("createReservation threw", err) }

  // Test 5: cancelReservation
  if (reservationId) {
    try {
      const invBefore = await prisma.inventory.findFirst({ where: { categoryId: cat.id, date: checkIn } })
      const unitsBefore = invBefore?.availableUnits ?? 0
      await provider.cancelReservation(reservationId)
      const invAfter = await prisma.inventory.findFirst({ where: { categoryId: cat.id, date: checkIn } })
      const unitsAfter = invAfter?.availableUnits ?? 0
      if (unitsAfter !== unitsBefore + 1) fail(`cancelReservation: units wrong`)
      else pass(`cancelReservation: restored ${String(unitsBefore)} → ${String(unitsAfter)}`)
      // Test 6: idempotent
      await provider.cancelReservation(reservationId)
      pass("cancelReservation (idempotent)")
    } catch (err) { fail("cancelReservation threw", err) }
  }

  // Test 7: getAddons
  try {
    const addons = await provider.getAddons(cat.id)
    if (!Array.isArray(addons)) fail("getAddons: not array")
    else pass(`getAddons: ${String(addons.length)} addons`)
  } catch (err) { fail("getAddons threw", err) }

  // Test 8: getAddons unknown
  try {
    const addons = await provider.getAddons("00000000-0000-0000-0000-000000000000")
    pass(`getAddons(unknown): empty (${String(addons.length)})`)
  } catch (err) { fail("getAddons(unknown) threw", err) }

  process.stdout.write("\n=== Service Layer Tests ===\n\n")

  // Test 9: searchAvailability
  const svcIn = new Date(); svcIn.setDate(svcIn.getDate() + 10); svcIn.setHours(0, 0, 0, 0)
  const svcOut = new Date(svcIn); svcOut.setDate(svcOut.getDate() + 3)
  try {
    const result = await searchAvailability({ checkIn: svcIn, checkOut: svcOut, guests: 2 })
    if (result.categories.length === 0) fail("searchAvailability: 0 categories")
    else {
      const allHaveRatePlans = result.categories.every((c) => c.ratePlans.length > 0)
      if (!allHaveRatePlans) fail("searchAvailability: some categories missing rate plans")
      else pass(`searchAvailability: ${String(result.categories.length)} categories, all with ratePlans`)
    }
  } catch (err) { fail("searchAvailability threw", err) }

  // Test 10: initiateBooking
  const bkIn = new Date(); bkIn.setDate(bkIn.getDate() + 20); bkIn.setHours(0, 0, 0, 0)
  const bkOut = new Date(bkIn); bkOut.setDate(bkOut.getDate() + 2)
  let svcResId: string | undefined
  try {
    const result = await initiateBooking({ categoryId: cat.id, ratePlanId: ratePlan.id, checkIn: bkIn, checkOut: bkOut, guests: 2, addonSelections: [] })
    svcResId = result.reservationId
    if (result.totalAmount <= 0) fail(`initiateBooking: totalAmount ${String(result.totalAmount)}`)
    else pass(`initiateBooking: ${result.reservationId}, total=${String(result.totalAmount)}`)
    if (svcResId) await cancelBooking(svcResId, "test_cleanup")
  } catch (err) {
    fail("initiateBooking threw", err)
    if (svcResId) await cancelBooking(svcResId, "test_cleanup").catch(() => {})
  }

  // Test 11: double initiateBooking lock
  const lkIn = new Date(); lkIn.setDate(lkIn.getDate() + 30); lkIn.setHours(0, 0, 0, 0)
  const lkOut = new Date(lkIn); lkOut.setDate(lkOut.getDate() + 2)
  let firstId: string | undefined
  try {
    const first = await initiateBooking({ categoryId: cat.id, ratePlanId: ratePlan.id, checkIn: lkIn, checkOut: lkOut, guests: 2, addonSelections: [] })
    firstId = first.reservationId
    try {
      await initiateBooking({ categoryId: cat.id, ratePlanId: ratePlan.id, checkIn: lkIn, checkOut: lkOut, guests: 2, addonSelections: [] })
      fail("double initiateBooking: should throw")
    } catch (err) {
      if (err instanceof Error && err.name === "AppError" && "code" in err && (err as { code: string }).code === "LOCK_ACQUISITION_FAILED")
        pass("double initiateBooking: LOCK_ACQUISITION_FAILED")
      else fail("double initiateBooking: wrong error", err)
    }
    if (firstId) await cancelBooking(firstId, "test_cleanup")
  } catch (err) {
    fail("double initiateBooking threw", err)
    if (firstId) await cancelBooking(firstId, "test_cleanup").catch(() => {})
  }

  process.stdout.write("\n=== Rate Plan & Circuit Breaker Tests ===\n\n")

  // Test 12: getAvailability returns rate plans with correct pricing
  try {
    const result = await provider.getAvailability({ checkIn: svcIn, checkOut: svcOut, guests: 1 })
    const firstCat = result.categories[0]
    if (!firstCat) { fail("Test 12: no categories"); }
    else {
      const basePlan = firstCat.ratePlans.find((rp) => rp.priceRule === "BASE")
      const multPlan = firstCat.ratePlans.find((rp) => rp.priceRule === "MULTIPLIER")
      if (!basePlan) fail("Test 12: no BASE plan")
      else if (!multPlan) fail("Test 12: no MULTIPLIER plan")
      else {
        const expectedMult = Math.round(basePlan.computedPricePerNight * 85 / 100)
        const diff = Math.abs(multPlan.computedPricePerNight - expectedMult)
        if (diff > 1) fail(`Test 12: MULTIPLIER price ${String(multPlan.computedPricePerNight)} != expected ${String(expectedMult)}`)
        else pass(`Test 12: BASE=${String(basePlan.computedPricePerNight)}, MULT(85%)=${String(multPlan.computedPricePerNight)}`)
      }
    }
  } catch (err) { fail("Test 12 threw", err) }

  // Test 13: createReservation with ratePlanId stored in DB
  const t13In = new Date(); t13In.setDate(t13In.getDate() + 40); t13In.setHours(0, 0, 0, 0)
  const t13Out = new Date(t13In); t13Out.setDate(t13Out.getDate() + 2)
  try {
    const res = await provider.createReservation({ categoryId: cat.id, ratePlanId: ratePlan.id, checkIn: t13In, checkOut: t13Out, guests: 2 })
    const dbRes = await prisma.reservation.findUnique({ where: { id: res.id } })
    if (!dbRes) fail("Test 13: reservation not in DB")
    else if (dbRes.ratePlanId !== ratePlan.id) fail(`Test 13: ratePlanId ${dbRes.ratePlanId} != ${ratePlan.id}`)
    else pass(`Test 13: ratePlanId stored correctly`)
    await provider.cancelReservation(res.id)
  } catch (err) { fail("Test 13 threw", err) }

  // Test 14: Circuit breaker
  try {
    const testCB = new CircuitBreaker({ name: "test-cb", failureThreshold: 5, successThreshold: 2, timeout: 30000 })
    let callCount = 0
    const failingFn = async (): Promise<string> => { callCount++; throw new Error("test failure") }
    for (let i = 0; i < 5; i++) { try { await testCB.execute(failingFn) } catch { /* expected */ } }
    if (testCB.getState() !== "OPEN") fail(`CB: state ${testCB.getState()}, expected OPEN`)
    else {
      const before = callCount
      try { await testCB.execute(failingFn); fail("CB: should throw when OPEN") } catch (err) {
        if (err instanceof Error && err.name === "AppError" && callCount === before)
          pass("CB: OPEN after 5 failures, throws without executing")
        else fail("CB: wrong behavior", err)
      }
    }
  } catch (err) { fail("CB test threw", err) }

  // Results
  process.stdout.write("\n")
  if (failures > 0) { process.stderr.write(`${RED}${String(failures)} test(s) failed${RESET}\n`); process.exit(1) }
  else process.stdout.write(`${GREEN}All tests passed!${RESET}\n`)
}

main()
  .catch((err: unknown) => { process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`); process.exit(1) })
  .finally(() => { void prisma.$disconnect() })
