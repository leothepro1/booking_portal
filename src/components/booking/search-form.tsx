"use client"

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { format, startOfDay, startOfMonth, parseISO } from "date-fns"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { DateRangePanel } from "@/components/ui/date-range-picker"
import { cn } from "@/lib/utils"
import { LABEL, UI, BODY, CAPTION } from "@/lib/typography"
import { formatSwedishDate, formatDateRange } from "@/lib/utils/dates"
import { useIsStuck, useOverlayControl } from "@/components/layout/header"

// ─── Constants ──────────────────────────────────────────────
type AccommodationType = "CAMPING" | "APARTMENT" | "HOTEL" | "CABIN"
type PanelId = "type" | "date" | "guests"

const ACCOMMODATION_TYPES: Array<{ value: AccommodationType; label: string }> = [
  { value: "CAMPING", label: "Campingtomter" },
  { value: "APARTMENT", label: "Lägenheter" },
  { value: "HOTEL", label: "Hotell" },
  { value: "CABIN", label: "Stugor" },
]

const ERRORS = {
  CHECK_IN_REQUIRED: "Välj incheckningsdatum",
  CHECK_OUT_REQUIRED: "Välj utcheckningsdatum",
  GUESTS_REQUIRED: "Lägg till minst 1 gäst",
} as const

const LABELS = {
  ACCOMMODATION_TYPE: "Boendetyp",
  GUESTS: "Vem",
  DATE: "När",
  DATE_PLACEHOLDER: "Lägg till datum",
  GUEST_PLACEHOLDER: "Lägg till gäster",
  ALL_TYPES: "Alla typer",
  TYPES_SELECTED: "typer valda",
  ADULTS: "Vuxna",
  ADULTS_DESC: "13 år och äldre",
  CHILDREN: "Barn",
  CHILDREN_DESC: "0–12 år",
} as const

const MOTION = {
  // Panel resize (switch between panels)
  duration: 350,
  ease: "cubic-bezier(0.33, 1, 0.68, 1)", // ease-out-cubic — smooth deceleration
  // Content crossfade
  fadeOut: 60,   // old content disappears fast
  fadeIn: 120,   // new content appears gently
  // Close
  closeDuration: 200,
  closeEase: "cubic-bezier(0.32, 0, 0.67, 0)", // ease-in — accelerates out
} as const

// ─── Component ──────────────────────────────────────────────
export function SearchForm(): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isStuck = useIsStuck()
  const setOverlay = useOverlayControl()
  const [checkIn, setCheckIn] = useState<Date | null>(null)
  const [checkOut, setCheckOut] = useState<Date | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<AccommodationType[]>(["CAMPING", "APARTMENT", "HOTEL", "CABIN"])
  const [adults, setAdults] = useState(0)
  const [children, setChildren] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Hydrate form state from URL search params
  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current) return
    const ciParam = searchParams.get("checkIn")
    const coParam = searchParams.get("checkOut")
    const guestsParam = searchParams.get("guests")
    const typesParam = searchParams.get("types")

    if (ciParam) {
      const parsed = parseISO(ciParam)
      if (!isNaN(parsed.getTime())) setCheckIn(parsed)
    }
    if (coParam) {
      const parsed = parseISO(coParam)
      if (!isNaN(parsed.getTime())) setCheckOut(parsed)
    }
    if (guestsParam) {
      const count = parseInt(guestsParam, 10)
      if (!isNaN(count) && count > 0) setAdults(count)
    }
    if (typesParam) {
      const types = typesParam.split(",").filter((t): t is AccommodationType =>
        ACCOMMODATION_TYPES.some((at) => at.value === t)
      )
      if (types.length > 0) setSelectedTypes(types)
    }
    hydrated.current = true
  }, [searchParams])

  // Reset loading and re-sync form state when navigation completes
  useEffect(() => {
    setIsLoading(false)
    setSubmitted(false)
    hydrated.current = false
  }, [pathname, searchParams])

  // Panel state
  const [activePanel, setActivePanel] = useState<PanelId | null>(null)
  const [contentVisible, setContentVisible] = useState(false)
  const [panelRect, setPanelRect] = useState({ left: 0, width: 0, height: 0 })
  const [highlightRect, setHighlightRect] = useState({ left: 0, width: 0, height: 0 })
  const [highlightReady, setHighlightReady] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRefs = useRef<Record<PanelId, HTMLElement | null>>({ type: null, date: null, guests: null })
  const measureRef = useRef<HTMLDivElement>(null) // invisible measure container

  const closePanel = useCallback(() => {
    setContentVisible(false)
    setTimeout(() => { setActivePanel(null); setIsTransitioning(false); setHighlightReady(false) }, MOTION.closeDuration)
  }, [])

  const togglePanel = useCallback((id: PanelId) => {
    if (activePanel === id) {
      closePanel()
    } else if (activePanel) {
      // Switch — fade out old, swap immediately, new content fades in with panel
      setContentVisible(false)
      setIsTransitioning(true)
      setTimeout(() => {
        setActivePanel(id)
        // Show new content right away — it rides along with the panel resize
        requestAnimationFrame(() => setContentVisible(true))
      }, MOTION.fadeOut)
    } else {
      // Fresh open
      setIsTransitioning(false)
      setHighlightReady(false)
      setActivePanel(id)
    }
  }, [activePanel, closePanel])

  // Measure panel + highlight
  useEffect(() => {
    if (!activePanel || !containerRef.current || !measureRef.current) return

    const measureAll = (setHighlight: boolean): void => {
      if (!containerRef.current || !measureRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const contentHeight = measureRef.current.offsetHeight
      const contentWidth = measureRef.current.offsetWidth

      // Panel
      if (activePanel === "date") {
        setPanelRect({ left: 0, width: containerRect.width, height: contentHeight })
      } else {
        const trigger = triggerRefs.current[activePanel]
        if (!trigger) return
        const triggerRect = trigger.getBoundingClientRect()
        let left = triggerRect.left - containerRect.left
        if (left + contentWidth > containerRect.width) left = containerRect.width - contentWidth
        if (left < 0) left = 0
        setPanelRect({ left, width: contentWidth, height: contentHeight })
      }

      // Highlight
      if (setHighlight) {
        const trigger = triggerRefs.current[activePanel]
        if (trigger) {
          const triggerRect = trigger.getBoundingClientRect()
          setHighlightRect({
            left: triggerRect.left - containerRect.left,
            width: triggerRect.width,
            height: triggerRect.height,
          })
          setHighlightReady(true)
        }
      }
    }

    // Immediate measure — always measure panel, measure highlight if switching (not from stuck)
    const raf = requestAnimationFrame(() => {
      measureAll(isTransitioning || !isStuck)
      if (!isTransitioning) {
        requestAnimationFrame(() => setContentVisible(true))
      }
    })

    // If coming from stuck, re-measure highlight after morph completes
    let remeasure: ReturnType<typeof setTimeout> | undefined
    if (!isTransitioning && isStuck) {
      remeasure = setTimeout(() => {
        measureAll(true)
      }, MOTION.duration + 20)
    }

    return () => { cancelAnimationFrame(raf); if (remeasure) clearTimeout(remeasure) }
  }, [activePanel, isTransitioning, isStuck])

  // Sync overlay with panel state
  useEffect(() => {
    setOverlay(activePanel !== null)
  }, [activePanel, setOverlay])

  // Close on outside click / escape
  useEffect(() => {
    if (!activePanel) return
    function handleClick(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) closePanel()
    }
    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape") closePanel()
    }
    const openedAt = Date.now()
    function handleScroll(): void {
      if (Date.now() - openedAt > MOTION.duration + 100) closePanel()
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey); window.removeEventListener("scroll", handleScroll) }
  }, [activePanel, closePanel])

  // Date state
  const today = startOfDay(new Date())
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today))
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  const handleRangeChange = useCallback((ci: Date | null, co: Date | null) => {
    setCheckIn(ci)
    setCheckOut(co)
  }, [])

  const handleClearDates = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setCheckIn(null)
    setCheckOut(null)
    setHoverDate(null)
  }, [])

  const toggleType = useCallback((type: AccommodationType) => {
    setSelectedTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type])
  }, [])

  const guestError = submitted && adults + children === 0 ? ERRORS.GUESTS_REQUIRED : undefined
  const dateError = submitted ? !checkIn ? ERRORS.CHECK_IN_REQUIRED : !checkOut ? ERRORS.CHECK_OUT_REQUIRED : undefined : undefined

  const handleSearch = useCallback(() => {
    setSubmitted(true)
    if (!checkIn || !checkOut || adults + children === 0) return
    setActivePanel(null)
    setIsLoading(true)
    const params = new URLSearchParams()
    params.set("checkIn", format(checkIn, "yyyy-MM-dd"))
    params.set("checkOut", format(checkOut, "yyyy-MM-dd"))
    params.set("guests", String(adults + children))
    if (selectedTypes.length > 0) params.set("types", selectedTypes.join(","))
    router.push(`/search?${params.toString()}`)
  }, [checkIn, checkOut, adults, children, selectedTypes, router])

  const guestIsPlaceholder = adults === 0 && children === 0
  const guestText = guestIsPlaceholder ? LABELS.GUEST_PLACEHOLDER : children === 0 ? `${String(adults)} vuxna` : `${String(adults)} vuxna, ${String(children)} barn`
  const dateIsPlaceholder = !checkIn
  const dateText = checkIn && checkOut ? formatDateRange(checkIn, checkOut) : checkIn ? `${formatSwedishDate(checkIn)} →` : LABELS.DATE_PLACEHOLDER
  const typeText = selectedTypes.length === 0 || selectedTypes.length === ACCOMMODATION_TYPES.length ? "Alla boenden" : selectedTypes.length === 1 ? ACCOMMODATION_TYPES.find((t) => t.value === selectedTypes[0])?.label ?? "" : `${String(selectedTypes.length)} ${LABELS.TYPES_SELECTED}`

  return (
    <div
      ref={containerRef}
      className="relative mx-auto rounded-[5000px]"
      style={{
        width: isStuck && !activePanel ? "max-content" : "100%",
        transition: `width ${String(MOTION.duration)}ms ${MOTION.ease}, background ${String(MOTION.duration)}ms ${MOTION.ease}, box-shadow ${String(MOTION.duration)}ms ${MOTION.ease}, border-color ${String(MOTION.duration)}ms ${MOTION.ease}`,
        ...(activePanel
          ? { background: "#EBEBEB", border: "1px solid #d4d5d9", boxShadow: "none" }
          : { background: "#fff", border: "1px solid transparent", boxShadow: "rgba(0, 0, 0, 0.1) 0px 3px 12px 0px, rgba(0, 0, 0, 0.08) 0px 1px 2px 0px" }
        ),
      }}
    >
      {/* Triggers */}
      <div className="relative flex flex-col md:flex-row md:items-center md:gap-0">
        {/* Sliding highlight */}
        <div
          className="pointer-events-none absolute z-0 rounded-[5000px] bg-white"
          style={{
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            opacity: activePanel && (highlightReady || isTransitioning) ? 1 : 0,
            boxShadow: activePanel ? "rgba(0, 0, 0, 0.1) 0px 3px 12px 0px, rgba(0, 0, 0, 0.08) 0px 1px 2px 0px" : "none",
            transition: isTransitioning
              ? `left ${String(MOTION.duration - 50)}ms ${MOTION.ease}, width ${String(MOTION.duration - 50)}ms ${MOTION.ease}, height ${String(MOTION.duration)}ms ${MOTION.ease}, opacity 80ms ease`
              : `opacity 80ms ease`,
          }}
        />

        <button ref={(el) => { triggerRefs.current.type = el }} type="button" onClick={() => togglePanel("type")} className={cn("relative z-10 flex w-full cursor-pointer items-center rounded-[5000px] focus:outline-none md:flex-1", !activePanel && "hover:bg-black/[0.03]")} style={{ padding: isStuck && !activePanel ? "10px 16px" : "15px 32px", justifyContent: isStuck && !activePanel ? "center" : "flex-start", textAlign: isStuck && !activePanel ? "center" : "left", transition: `padding ${String(MOTION.duration)}ms ${MOTION.ease}` }}>
          <MorphTriggerContent isCompact={isStuck && !activePanel} compactText={typeText}>
            <span className="pb-[2px] text-xs font-medium text-[#222222]">{LABELS.ACCOMMODATION_TYPE}</span>
            <span className="text-sm font-medium text-[#222222]">{typeText}</span>
          </MorphTriggerContent>
        </button>

        <div className="my-auto hidden h-8 w-px shrink-0 md:block" style={{ backgroundColor: "#DDDDDD", opacity: activePanel ? 0 : 1, transition: `opacity 200ms ease` }} />

        <button ref={(el) => { triggerRefs.current.date = el }} type="button" onClick={() => togglePanel("date")} className={cn("relative z-10 flex w-full cursor-pointer items-center rounded-[5000px] focus:outline-none md:flex-1", !activePanel && "hover:bg-black/[0.03]")} style={{ padding: isStuck && !activePanel ? "10px 16px" : "15px 24px", justifyContent: isStuck && !activePanel ? "center" : "flex-start", textAlign: isStuck && !activePanel ? "center" : "left", transition: `padding ${String(MOTION.duration)}ms ${MOTION.ease}` }}>
          <MorphTriggerContent isCompact={isStuck && !activePanel} compactText={dateText} className="min-w-0 flex-1">
            <span className="pb-[2px] text-xs font-medium text-[#222222]">{LABELS.DATE}</span>
            <span className="truncate text-sm" style={{ color: dateIsPlaceholder ? "#6a6a6a" : "#222222", fontWeight: dateIsPlaceholder ? 400 : 500 }}>{dateText}</span>
          </MorphTriggerContent>
          {checkIn && <span role="button" tabIndex={0} onPointerDown={handleClearDates} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClearDates(e as unknown as React.MouseEvent) } }} className="flex size-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full hover:bg-black/[0.06]" aria-label="Rensa datum" style={{ opacity: isStuck && !activePanel ? 0 : 1, width: isStuck && !activePanel ? 0 : 24, marginLeft: isStuck && !activePanel ? 0 : 8, pointerEvents: isStuck && !activePanel ? "none" : "auto", transition: `opacity ${String(MOTION.duration * 0.3)}ms ease, width ${String(MOTION.duration)}ms ${MOTION.ease}, margin-left ${String(MOTION.duration)}ms ${MOTION.ease}` }}><Icon name="close" size={16} className="text-[#202020]" /></span>}
        </button>

        <div className="my-auto hidden h-8 w-px shrink-0 md:block" style={{ backgroundColor: "#DDDDDD", opacity: activePanel ? 0 : 1, transition: `opacity 200ms ease` }} />

        <div className="relative z-10 md:flex-1" ref={(el) => { triggerRefs.current.guests = el }}>
          <button type="button" onClick={() => togglePanel("guests")} className={cn("flex w-full cursor-pointer items-center whitespace-nowrap rounded-[5000px] focus:outline-none", !activePanel && "hover:bg-black/[0.03]")} style={{ padding: isStuck && !activePanel ? "10px 48px 10px 16px" : "15px 64px 15px 24px", justifyContent: isStuck && !activePanel ? "center" : "flex-start", textAlign: isStuck && !activePanel ? "center" : "left", transition: `padding ${String(MOTION.duration)}ms ${MOTION.ease}` }}>
            <MorphTriggerContent isCompact={isStuck && !activePanel} compactText={guestText}>
              <span className="pb-[2px] text-xs font-medium text-[#222222]">{LABELS.GUESTS}</span>
              <span className="text-sm" style={{ color: guestIsPlaceholder ? "#6a6a6a" : "#222222", fontWeight: guestIsPlaceholder ? 400 : 500 }}>{guestText}</span>
            </MorphTriggerContent>
          </button>
          <div className="pointer-events-none absolute inset-y-0 flex items-center" style={{ right: isStuck && !activePanel ? 7 : 16, transition: `right ${String(MOTION.duration)}ms ${MOTION.ease}` }}>
            <button
              type="button"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleSearch() }}
              disabled={isLoading}
              className="pointer-events-auto flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-0 bg-[#207EA9] text-white hover:bg-[#1b6d93]"
              style={{
                width: activePanel ? 88 : isStuck ? 32 : 44,
                height: activePanel ? 44 : isStuck ? 32 : 44,
                transition: `width ${String(MOTION.duration)}ms ${MOTION.ease}, height ${String(MOTION.duration)}ms ${MOTION.ease}`,
              }}
            >
              {isLoading ? <Loader2 className="size-5 animate-spin" /> : (
                <>
                  <Icon name="search" size={isStuck && !activePanel ? 16 : 20} className="shrink-0 text-white" />
                  <span
                    className="overflow-hidden whitespace-nowrap font-semibold text-white"
                    style={{
                      fontSize: 16,
                      width: activePanel ? 36 : 0,
                      marginLeft: activePanel ? 4 : 0,
                      opacity: activePanel ? 1 : 0,
                      transition: `width ${String(MOTION.duration)}ms ${MOTION.ease}, margin-left ${String(MOTION.duration)}ms ${MOTION.ease}, opacity ${activePanel ? String(MOTION.duration) : "80"}ms ease`,
                    }}
                  >
                    Sök
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Errors */}
      {dateError && <p className="mt-1 px-5 text-xs text-red-600">{dateError}</p>}
      {guestError && <p className="mt-1 px-5 text-xs text-red-600">{guestError}</p>}

      {/* Invisible measure container — always auto-sized, never clipped */}
      {activePanel && (
        <div ref={measureRef} className="pointer-events-none invisible absolute left-0 top-0 z-[-1] w-max" aria-hidden="true">
          <PanelContent panel={activePanel} selectedTypes={selectedTypes} onToggleType={toggleType} checkIn={checkIn} checkOut={checkOut} onRangeChange={handleRangeChange} minDate={today} viewMonth={viewMonth} onViewMonthChange={setViewMonth} hoverDate={hoverDate} onHoverDateChange={setHoverDate} adults={adults} children_={children} onAdultsChange={setAdults} onChildrenChange={setChildren} containerWidth={containerRef.current?.offsetWidth ?? 850} />
        </div>
      )}

      {/* Visible animated panel */}
      <div
        className="absolute top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06]"
        style={{
          left: panelRect.left,
          width: activePanel ? panelRect.width : panelRect.width,
          height: activePanel ? panelRect.height : 0,
          opacity: activePanel ? 1 : 0,
          transition: isTransitioning
            ? [
                // Switch: position/width faster than height for snappier feel
                `left ${String(MOTION.duration - 50)}ms ${MOTION.ease}`,
                `width ${String(MOTION.duration - 50)}ms ${MOTION.ease}`,
                `height ${String(MOTION.duration)}ms ${MOTION.ease}`,
                `opacity ${String(MOTION.fadeIn)}ms ease`,
              ].join(", ")
            : !activePanel
              ? [
                  // Close: faster, accelerating
                  `height ${String(MOTION.closeDuration)}ms ${MOTION.closeEase}`,
                  `width ${String(MOTION.closeDuration)}ms ${MOTION.closeEase}`,
                  `left ${String(MOTION.closeDuration)}ms ${MOTION.closeEase}`,
                  `opacity ${String(MOTION.closeDuration * 0.6)}ms ease`,
                ].join(", ")
              : "none", // Fresh open: keyframe handles it
          animation: activePanel && !isTransitioning ? `panel-grow ${String(MOTION.duration)}ms ${MOTION.ease} both` : "none",
          pointerEvents: activePanel ? "auto" : "none",
        }}
      >
        <div style={{
          opacity: contentVisible ? 1 : 0,
          transition: contentVisible
            ? `opacity ${String(MOTION.fadeIn)}ms ease-out`
            : `opacity ${String(MOTION.fadeOut)}ms ease-in`,
        }}>
          {activePanel && (
            <PanelContent panel={activePanel} selectedTypes={selectedTypes} onToggleType={toggleType} checkIn={checkIn} checkOut={checkOut} onRangeChange={handleRangeChange} minDate={today} viewMonth={viewMonth} onViewMonthChange={setViewMonth} hoverDate={hoverDate} onHoverDateChange={setHoverDate} adults={adults} children_={children} onAdultsChange={setAdults} onChildrenChange={setChildren} containerWidth={containerRef.current?.offsetWidth ?? 850} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Morph trigger content ──────────────────────────────────
function MorphTriggerContent({ isCompact, compactText, children, className }: { isCompact: boolean; compactText: string; children: React.ReactNode; className?: string | undefined }): React.ReactElement {
  const dur = MOTION.duration
  const e = MOTION.ease
  return (
    <div className={cn("relative", className)}>
      {/* Expanded: label + value — collapses height when compact */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          maxHeight: isCompact ? 0 : 50,
          opacity: isCompact ? 0 : 1,
          transform: isCompact ? "translateY(-3px) scale(0.97)" : "translateY(0) scale(1)",
          transformOrigin: "center center",
          transition: `max-height ${String(dur)}ms ${e}, opacity ${String(dur * 0.4)}ms ${e}, transform ${String(dur)}ms ${e}`,
        }}
      >
        {children}
      </div>
      {/* Compact: single line value — grows in */}
      <div
        className="overflow-hidden"
        style={{
          maxHeight: isCompact ? 24 : 0,
          opacity: isCompact ? 1 : 0,
          transform: isCompact ? "translateY(0) scale(1)" : "translateY(3px) scale(0.97)",
          transformOrigin: "center center",
          transition: `max-height ${String(dur)}ms ${e}, opacity ${String(dur * 0.5)}ms ${e} ${isCompact ? `${String(dur * 0.2)}ms` : "0ms"}, transform ${String(dur)}ms ${e}`,
        }}
      >
        <span className="flex items-center whitespace-nowrap text-sm" style={{ color: "#202020", fontWeight: 500 }}>
          {compactText}
        </span>
      </div>
    </div>
  )
}

// ─── Counter ────────────────────────────────────────────────
function CounterControl({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }): React.ReactElement {
  const canDec = value > min; const canInc = value < max
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => canDec && onChange(value - 1)} disabled={!canDec} className={cn("flex size-8 items-center justify-center rounded-full border-0 bg-[#F2F2F2] transition-colors duration-150", canDec ? "cursor-pointer text-[#202020] hover:bg-[#E5E5E5]" : "cursor-not-allowed text-[#9b9b9b] opacity-40")} aria-label="Minska"><Icon name="remove" size={20} /></button>
      <span className="min-w-[24px] text-center text-base font-medium text-[#202020]">{String(value)}</span>
      <button type="button" onClick={() => canInc && onChange(value + 1)} disabled={!canInc} className={cn("flex size-8 items-center justify-center rounded-full border-0 bg-[#F2F2F2] transition-colors duration-150", canInc ? "cursor-pointer text-[#202020] hover:bg-[#E5E5E5]" : "cursor-not-allowed text-[#9b9b9b] opacity-40")} aria-label="Öka"><Icon name="add" size={20} /></button>
    </div>
  )
}

// ─── Checkbox ───────────────────────────────────────────────
function AnimatedCheckbox({ checked }: { checked: boolean }): React.ReactElement {
  return (
    <div className={cn("flex size-5 items-center justify-center rounded border transition-colors duration-200", checked ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white")}>
      <svg className="size-3" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4 8.5L11 1.5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={14} strokeDashoffset={checked ? 0 : 14} style={{ transition: "stroke-dashoffset 250ms ease" }} /></svg>
    </div>
  )
}

// ─── Panel content (shared between measure + visible) ───────
interface PanelContentProps {
  panel: PanelId
  selectedTypes: AccommodationType[]
  onToggleType: (t: AccommodationType) => void
  checkIn: Date | null
  checkOut: Date | null
  onRangeChange: (ci: Date | null, co: Date | null) => void
  minDate: Date
  viewMonth: Date
  onViewMonthChange: (d: Date) => void
  hoverDate: Date | null
  onHoverDateChange: (d: Date | null) => void
  adults: number
  children_: number
  onAdultsChange: (n: number) => void
  onChildrenChange: (n: number) => void
  containerWidth: number
}

function PanelContent({ panel, selectedTypes, onToggleType, checkIn, checkOut, onRangeChange, minDate, viewMonth, onViewMonthChange, hoverDate, onHoverDateChange, adults, children_, onAdultsChange, onChildrenChange, containerWidth }: PanelContentProps): React.ReactElement {
  if (panel === "type") {
    return (
      <div className="w-max px-5 py-[22px]">
        {ACCOMMODATION_TYPES.map((type) => {
          const isSelected = selectedTypes.includes(type.value)
          return (
            <button key={type.value} type="button" onClick={() => onToggleType(type.value)} className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left transition-all duration-200 hover:bg-slate-50">
              <AnimatedCheckbox checked={isSelected} />
              <span className={cn(BODY, isSelected ? "font-medium text-[#202020]" : "text-[#6b6b6b]")}>{type.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  if (panel === "date") {
    return (
      <div style={{ width: containerWidth }}>
        <DateRangePanel checkIn={checkIn} checkOut={checkOut} onRangeChange={onRangeChange} minDate={minDate} viewMonth={viewMonth} onViewMonthChange={onViewMonthChange} hoverDate={hoverDate} onHoverDateChange={onHoverDateChange} />
      </div>
    )
  }

  return (
    <div className="w-max min-w-[280px] px-8 py-[18px]">
      <div className="flex items-center justify-between gap-8 py-[14px]">
        <div><p className="pb-[3px] font-medium text-[#202020]" style={{ fontSize: 16 }}>{LABELS.ADULTS}</p><p style={{ fontSize: 14, color: "#6a6a6a" }}>{LABELS.ADULTS_DESC}</p></div>
        <CounterControl value={adults} min={0} max={10} onChange={onAdultsChange} />
      </div>
      <div className="border-t border-slate-200" />
      <div className="flex items-center justify-between gap-8 py-[14px]">
        <div><p className="pb-[3px] font-medium text-[#202020]" style={{ fontSize: 16 }}>{LABELS.CHILDREN}</p><p style={{ fontSize: 14, color: "#6a6a6a" }}>{LABELS.CHILDREN_DESC}</p></div>
        <CounterControl value={children_} min={0} max={10} onChange={onChildrenChange} />
      </div>
    </div>
  )
}
