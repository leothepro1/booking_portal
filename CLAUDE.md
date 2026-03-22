# CLAUDE.md — Bokningsportal

> Detta dokument är din absoluta källa till sanning för hela projektet.
> Läs det i sin helhet innan du skriver en enda rad kod.
> Vid konflikt mellan en prompt och detta dokument — följ detta dokument och flagga konflikten.

---

## 1. Projektidentitet

Detta är en produktionskritisk bokningsportal byggd för en enskild kund inom
camping och glamping. Kunden omsätter 100 MSEK årligen och behandlar tusentals
transaktioner per dag. Systemet är inte en SaaS-produkt — det finns en kund,
en Mews-integration, en Swedbank Pay-integration.

**Kvalitetsmåttstocken är enkel och oförhandlingsbar:**
> "Hade Booking.com godkänt detta?"
> Om svaret är något annat än ett obetingat ja — är vi inte klara.

Detta gäller UI, UX, felhantering, prestanda, robusthet och säkerhet utan undantag.

---

## 2. Tech Stack

| Lager | Val | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.x |
| Språk | TypeScript | 5.x — strict mode, zero `any` |
| ORM | Prisma | 6.x |
| Databas | PostgreSQL | 16.x |
| Cache / Lås | Redis (Upstash) | — |
| Validering | Zod | 3.x |
| Mail | Resend | latest |
| Styling | Tailwind CSS | 4.x |
| Komponenter | shadcn/ui | latest |
| Betalning | Swedbank Pay Checkout v3 | — |
| PMS | Mews Connector API v1 | — (mock i dev/staging) |
| Deployment | Vercel | — |

**TypeScript-regler som aldrig bryts:**
- `strict: true` i tsconfig — inga undantag
- Noll användning av `any` — använd `unknown` och validera
- Alla externa API-svar valideras med Zod innan de används
- Alla funktioner har explicita returtyper

---

## 3. Miljöstruktur

Tre miljöer. Alla tre är definierade i `.env.example`.
```
dev      → lokalt i Codespace, MockBookingProvider, lokal Postgres + Redis via Docker
staging  → Vercel preview branch, MockBookingProvider (senare Mews sandbox)
prod     → Vercel production, MewsBookingProvider, Swedbank Pay live
```

**Miljövariabeln som styr allt:**
```
BOOKING_PROVIDER=mock   # dev + staging
BOOKING_PROVIDER=mews   # prod
```

Ingen kod utanför `src/lib/providers/` får bry sig om vilket provider som är aktivt.

---

## 4. Arkitektur — Repository Pattern med Provider-abstraktion

Detta är den viktigaste arkitekturregeln i hela projektet.

### 4.1 Lagret får aldrig hoppas över
```
Route Handler / Server Action
        ↓
   Service Layer          ← affärslogik, validering, orkestrering
        ↓
  BookingProvider         ← interfacet — ALDRIG konkret implementation härifrån
        ↓
MockProvider | MewsProvider  ← konkreta implementationer, isolerade
```

En Route Handler anropar aldrig Prisma direkt.
En Route Handler anropar aldrig Mews direkt.
En Route Handler anropar aldrig Swedbank Pay direkt.
Allt går genom Service Layer.

### 4.2 BookingProvider-interfacet

Detta interface är kontraktet. Båda providers implementerar det identiskt.
```typescript
interface BookingProvider {
  // Hämta tillgängliga boenden för ett datumintervall
  getAvailability(params: AvailabilityParams): Promise

  // Hämta detaljer om ett specifikt boende
  getAccommodation(id: string): Promise

  // Skapa en preliminär reservation (hold)
  createReservation(params: CreateReservationParams): Promise

  // Bekräfta reservation efter genomförd betalning
  confirmReservation(reservationId: string, paymentId: string): Promise

  // Avbryt en reservation (t.ex. vid avbruten betalning)
  cancelReservation(reservationId: string): Promise

  // Hämta tillgängliga tillägg (add-ons) för ett boende
  getAddons(accommodationId: string): Promise
}
```

Inget annat får läggas på interfacet utan att ett arkitekturbeslut dokumenteras här.

### 4.3 MockProvider

MockProvider läser från PostgreSQL via Prisma.
MockProvider skriver till PostgreSQL via Prisma.
MockProvider beter sig identiskt med MewsProvider ur systemets perspektiv.
MockProvider lägger aldrig till "mock-specifik" logik — om Mews inte skulle
göra det, gör inte MockProvider det heller.

---

## 5. Databasschema — Principer

- Alla tabeller har `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`
- Alla tabeller har `created_at TIMESTAMPTZ DEFAULT now()` och `updated_at TIMESTAMPTZ`
- Soft delete på alla tabeller — `deleted_at TIMESTAMPTZ NULL`
- Aldrig `CASCADE DELETE` på betalnings- eller bokningsdata
- Alla belopp lagras i **ören (heltal)** — aldrig float, aldrig decimal för pengar
- Alla tidszoner lagras som UTC — konvertering sker i presentationslagret

---

## 6. Felhantering — Inga undantag

### 6.1 Alla externa anrop följer detta mönster
```typescript
// Varje externt anrop har:
// 1. Explicit timeout
// 2. Retry med exponential backoff (max 3 försök)
// 3. Structured error logging
// 4. Meningsfull fallback eller felkod till klienten
```

### 6.2 Felkoder är strukturerade
```typescript
type AppError = {
  code: string        // t.ex. "AVAILABILITY_FETCH_FAILED"
  message: string     // human-readable, loggas
  userMessage: string // visas för användaren — aldrig tekniska detaljer
  retryable: boolean  // kan klienten försöka igen?
}
```

### 6.3 Circuit Breaker för Mews

Mews-providern har en circuit breaker med tre tillstånd:
- `CLOSED` — normalt läge
- `OPEN` — Mews svarar inte, inga bokningar tas emot, tydligt felmeddelande visas
- `HALF_OPEN` — testar återuppkoppling

---

## 7. Betalningsflödet — Kritiska regler

1. **Idempotency key är obligatorisk** på varje betalningsförsök.
   Nyckeln genereras på servern som `booking_${reservationId}_${attempt}`.
   Samma nyckel vid retry — aldrig en ny.

2. **Distribuerat lås** aktiveras när gästen når checkout.
   Redis-lås med TTL 10 minuter på `lock:reservation:{accommodationId}:{checkIn}:{checkOut}`.
   Om låset inte kan tas — kommunicera tydligt att boende inte längre är tillgängligt.

3. **Bokningstoken** skapas för varje genomförd bokning.
   Format: `UUID v4`, lagras i databasen, skickas i bekräftelsemailet.
   Gästen kan använda token för att visa/avboka sin bokning utan att vara inloggad.

4. **Betalningsstatus är en state machine** — aldrig en fri textsträng.
```
   PENDING → AUTHORIZED → CAPTURED → REFUNDED
                        → CANCELLED
```

5. **Audit log är obligatorisk** — varje tillståndsändring i betalningsflödet
   skriver en oföränderlig rad i `payment_events`-tabellen.

---

## 8. Bokningsflödets steg
```
1. Datumval
2. Visning av lediga boenden (med priser)
3. Val av boende
4. Val av tillägg (add-ons)
5. Sammanfattning + gästinformation
6. Checkout (Swedbank Pay)
7. Bekräftelse (e-post + bokningssida med token)
```

Inget steg får hoppas över. Inget steg får nås utan att föregående steg är komplett.
State hanteras server-side — URL-parametrar valideras alltid, aldrig trusted client-state.

---

## 9. UI/UX-principer

- **Mobile first** — designas för 375px, skalas upp
- **Laddningstillstånd alltid** — ingen aktion utan visuell feedback
- **Optimistisk UI där det är möjligt** — men aldrig på betalning
- **Felmeddelanden är handlingsbara** — aldrig "något gick fel", alltid vad användaren kan göra
- **Pristransparens** — totalpris alltid synligt, inga dolda avgifter
- **Tangentbordsnavigering** — alla interaktiva element är nåbara via tangentbord
- Datum visas alltid på svenska (`sv-SE` locale)
- Belopp visas alltid i SEK med tusentalsavgränsare

---

## 10. Logging

Alla loggposter är strukturerade JSON. Aldrig `console.log` i produktion.
```typescript
logger.info("reservation.created", {
  reservationId,
  accommodationId,
  checkIn,
  checkOut,
  totalAmount,  // i ören
})
```

Känslig data (personnummer, kortnummer, fullständiga e-postadresser) loggas aldrig.

---

## 11. Definition of Done

En feature är klar när **alla** dessa punkter är uppfyllda:

- [ ] TypeScript kompilerar utan fel eller varningar
- [ ] Alla externa API-svar är Zod-validerade
- [ ] Happy path fungerar
- [ ] Felfall är hanterade och returnerar strukturerade AppError
- [ ] Laddningstillstånd finns i UI
- [ ] Mobilvy är testad (375px)
- [ ] Inga `console.log` finns kvar
- [ ] Inga hårdkodade strängar — texter i konstanter eller i18n
- [ ] Databasoperationer använder transaktioner där flera writes sker
- [ ] Ny miljövariabel är tillagd i `.env.example` med kommentar

---

## 12. Vad Claude Code aldrig får göra

- Skriva `any` i TypeScript
- Anropa Prisma direkt från en Route Handler
- Anropa externa API:er utan timeout och felhantering
- Lagra belopp som float
- Lita på client-skickad data utan Zod-validering
- Använda `console.log`
- Skapa en ny miljövariabel utan att lägga till den i `.env.example`
- Implementera mock-specifik logik som inte skulle finnas i Mews-providern
- Skippa audit logging på betalningsrelaterade händelser

##  2.1 Tekniska beslut — kanoniserade

Dessa beslut fattades under Prompt #1 och gäller för hela projektet.

**Prisma 6.x**
Använder prisma.config.ts-formatet. Prisma-klienten instansieras
med global singleton-pattern anpassad för v6. Inga v5-mönster används.

**Tailwind v4**
Ingen tailwind.config.ts existerar — konfiguration sker uteslutande
via CSS (globals.css). shadcn/ui är konfigurerat för denna setup.
Lägg aldrig till en tailwind.config.ts.

**exactOptionalPropertyTypes**
Aktiv i tsconfig. Shadcn-genererade komponenter kan kräva minimala
typanpassningar vid installation — detta är förväntat och acceptabelt.
Claude Code ska alltid åtgärda dessa utan att sänka TypeScript-nivån.

**Sonner istället för toast**
shadcn/ui:s toast-komponent är deprecated. Sonner används för alla
notifikationer i hela projektet. Importeras från "sonner".

**Logger**
Använder process.stdout.write / process.stderr.write.
Aldrig console.log, console.warn eller console.error i egen kod.

**Prisma 6 — adapter-pattern**
PrismaClient kräver @prisma/adapter-pg + pg. Alla instansieringar
av PrismaClient använder adapter-pattern. Gäller db/index.ts,
seed-script och alla scripts/.

**Logging och transaktioner**
Logger-anrop sker alltid efter att en transaktion lyckats —
aldrig inuti $transaction. En loggpost som aldrig skrivs är
bättre än en loggpost för något som rullades tillbaka.