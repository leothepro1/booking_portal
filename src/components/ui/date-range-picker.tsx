"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  addMonths,
  addDays,
  getDay,
  isSameDay,
  isBefore,
  isAfter,
  eachDayOfInterval,
  differenceInDays,
} from "date-fns"
import { sv } from "date-fns/locale"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { formatSwedishDate, formatDateRange, getNights } from "@/lib/utils/dates"
import { OVERLINE, H4, UI_LG, UI_SM, BODY, CAPTION } from "@/lib/typography"

// ─── CSS Variables (single source of truth for accent) ──────
const CSS_VARS = {
  "--dp-accent": "#207EA9",
  "--dp-accent-light": "rgba(32, 126, 169, 0.12)",
  "--dp-accent-range": "rgba(32, 126, 169, 0.10)",
} as const

// ─── Constants ──────────────────────────────────────────────
const WEEKDAYS = ["MÅ", "TI", "ON", "TO", "FR", "LÖ", "SÖ"] as const

const TEXT = {
  LABEL: "När",
  SELECT: "Lägg till datum",
  SELECT_CHECKIN: "Välj incheckning",
  SELECT_CHECKOUT: "Välj utcheckning",
  DONE: "Klar",
  NIGHTS_SUFFIX: "nätter",
  NIGHT_SUFFIX: "natt",
  PREV_MONTH: "Föregående månad",
  NEXT_MONTH: "Nästa månad",
} as const

// ─── Props ──────────────────────────────────────────────────
interface DateRangePickerProps {
  checkIn: Date | null
  checkOut: Date | null
  onRangeChange: (checkIn: Date | null, checkOut: Date | null) => void
  minDate?: Date | undefined
  maxNights?: number | undefined
  className?: string | undefined
  error?: string | undefined
}

// ─── Component ──────────────────────────────────────────────
export function DateRangePicker({
  checkIn,
  checkOut,
  onRangeChange,
  minDate,
  maxNights = 30,
  className,
  error,
}: DateRangePickerProps): React.ReactElement {
  const today = startOfDay(new Date())
  const effectiveMinDate = minDate ?? addDays(today, 0)

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(checkIn ?? today))
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number | null>(null)

  const canGoPrev = isAfter(viewMonth, startOfMonth(today))

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleMouseDown(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handleDayClick = useCallback(
    (date: Date) => {
      if (!checkIn || (checkIn && checkOut)) {
        // First click or reset
        onRangeChange(date, null)
        setHoverDate(null)
      } else {
        // Second click
        if (isBefore(date, checkIn) || isSameDay(date, checkIn)) {
          // Clicked before or on start — reset
          onRangeChange(date, null)
          setHoverDate(null)
        } else {
          const nights = differenceInDays(date, checkIn)
          if (nights > maxNights) return
          onRangeChange(checkIn, date)
          setHoverDate(null)
          // Auto-close after delay
          setTimeout(() => setIsOpen(false), 300)
        }
      }
    },
    [checkIn, checkOut, onRangeChange, maxNights]
  )

  const handleDayHover = useCallback(
    (date: Date) => {
      if (checkIn && !checkOut && isAfter(date, checkIn)) {
        setHoverDate(date)
      } else {
        setHoverDate(null)
      }
    },
    [checkIn, checkOut]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onRangeChange(null, null)
      setHoverDate(null)
    },
    [onRangeChange]
  )

  // Mobile swipe in bottom sheet
  const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null
  }, [])

  const handleSheetTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return
      const endY = e.changedTouches[0]?.clientY ?? 0
      const delta = touchStartY.current - endY
      touchStartY.current = null

      if (delta > 50) {
        // Swipe up → next month
        setViewMonth((prev) => addMonths(prev, 1))
      } else if (delta < -80) {
        // Swipe down → close
        setIsOpen(false)
      }
    },
    []
  )

  // Trigger text
  let triggerText: string
  if (checkIn && checkOut) {
    triggerText = formatDateRange(checkIn, checkOut)
  } else if (checkIn) {
    triggerText = `${formatSwedishDate(checkIn)} →`
  } else {
    triggerText = TEXT.SELECT
  }

  const nightCount = checkIn && checkOut ? getNights(checkIn, checkOut) : null

  // Month labels for header navigation
  const viewMonthLabel = format(viewMonth, "MMMM yyyy", { locale: sv })
  const nextMonthLabel = format(addMonths(viewMonth, 1), "MMMM yyyy", { locale: sv })
  const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <div ref={containerRef} className={cn("static", className)} style={CSS_VARS as React.CSSProperties}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-5 text-left transition-colors duration-150 hover:bg-black/[0.04] focus:outline-none"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={OVERLINE}>
            {TEXT.LABEL}
          </span>
          <span className={cn(H4, "truncate", checkIn ? "text-[#202020]" : "text-[#202020]")}>
            {triggerText}
          </span>
        </div>
        {checkIn && (
          <button
            type="button"
            onClick={handleClear}
            className="flex size-6 cursor-pointer items-center justify-center rounded-full transition-all duration-200 hover:bg-slate-100"
            aria-label="Rensa datum"
          >
            <Icon name="close" size={16} className="text-[#202020]" />
          </button>
        )}
      </button>

      {/* Error */}
      {error && <p className="mt-1 px-1 text-xs text-red-600">{error}</p>}

      {/* Desktop popover */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Popover / Bottom sheet */}
          <div
            className={cn(
              "z-50 bg-white p-6",
              // Mobile: bottom sheet
              "fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[20px] shadow-[0_-4px_24px_rgba(0,0,0,0.12)]",
              // Desktop: absolute popover
              "md:absolute md:inset-x-0 md:top-[calc(100%+8px)] md:bottom-auto md:max-h-none md:overflow-visible md:rounded-2xl md:shadow-[0_8px_40px_rgba(0,0,0,0.12)] md:ring-1 md:ring-black/[0.06]"
            )}
            style={{ transformOrigin: "top center", animation: "panel-grow 320ms cubic-bezier(0.32, 0.72, 0, 1) both" }}
            onTouchStart={handleSheetTouchStart}
            onTouchEnd={handleSheetTouchEnd}
          >
            {/* Mobile drag handle */}
            <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-slate-300 md:hidden" />

            {/* Month navigation header */}
            <div className="mb-5 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
              {/* Left month header: ← [Month Name centered] */}
              <div className="grid grid-cols-[36px_1fr_36px] items-center">
                <button
                  type="button"
                  onClick={() => canGoPrev && setViewMonth((m) => addMonths(m, -1))}
                  disabled={!canGoPrev}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white transition-all duration-300",
                    canGoPrev
                      ? "cursor-pointer opacity-100 hover:border-slate-400"
                      : "pointer-events-none cursor-default opacity-0"
                  )}
                  aria-label={TEXT.PREV_MONTH}
                >
                  <Icon name="chevron_left" size={20} />
                </button>
                <span className="text-center font-semibold text-[#202020]" style={{ fontSize: 16 }}>{capitalize(viewMonthLabel)}</span>
                {/* Spacer on mobile where next arrow lives, empty on desktop */}
                <span className="md:hidden">
                  <button
                    type="button"
                    onClick={() => setViewMonth((m) => addMonths(m, 1))}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white transition-all duration-200 hover:border-slate-400"
                    aria-label={TEXT.NEXT_MONTH}
                  >
                    <Icon name="chevron_right" size={20} />
                  </button>
                </span>
                <span className="hidden md:block" />
              </div>

              {/* Right month header (desktop only): [Month Name centered] → */}
              <div className="hidden items-center md:grid md:grid-cols-[36px_1fr_36px]">
                <span />
                <span className="text-center font-semibold text-[#202020]" style={{ fontSize: 16 }}>{capitalize(nextMonthLabel)}</span>
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white transition-all duration-200 hover:border-slate-400"
                  aria-label={TEXT.NEXT_MONTH}
                >
                  <Icon name="chevron_right" size={20} />
                </button>
              </div>
            </div>

            {/* Month grids */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <MonthGrid
                month={viewMonth}
                checkIn={checkIn}
                checkOut={checkOut}
                hoverDate={hoverDate}
                minDate={effectiveMinDate}
                today={today}
                onDayClick={handleDayClick}
                onDayHover={handleDayHover}
                onMouseLeave={() => setHoverDate(null)}
              />
              <div className="hidden md:block">
                <MonthGrid
                  month={addMonths(viewMonth, 1)}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  hoverDate={hoverDate}
                  minDate={effectiveMinDate}
                  today={today}
                  onDayClick={handleDayClick}
                  onDayHover={handleDayHover}
                  onMouseLeave={() => setHoverDate(null)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                {nightCount !== null && (
                  <span className={cn(BODY, "text-[#6b6b6b]")}>
                    {String(nightCount)} {nightCount === 1 ? TEXT.NIGHT_SUFFIX : TEXT.NIGHTS_SUFFIX}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={cn(UI_LG, "cursor-pointer rounded-lg px-6 py-2.5 text-white transition-all duration-200 hover:opacity-90")}
                style={{ backgroundColor: "var(--dp-accent)" }}
              >
                {TEXT.DONE}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Month grid ─────────────────────────────────────────────

interface MonthGridProps {
  month: Date
  checkIn: Date | null
  checkOut: Date | null
  hoverDate: Date | null
  minDate: Date
  today: Date
  onDayClick: (date: Date) => void
  onDayHover: (date: Date) => void
  onMouseLeave: () => void
}

function MonthGrid({
  month,
  checkIn,
  checkOut,
  hoverDate,
  minDate,
  today,
  onDayClick,
  onDayHover,
  onMouseLeave,
}: MonthGridProps): React.ReactElement {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Monday=0 offset (getDay: 0=Sun, 1=Mon...)
  const startDow = getDay(monthStart)
  const offset = startDow === 0 ? 6 : startDow - 1

  const effectiveEnd = checkOut ?? hoverDate

  return (
    <div onMouseLeave={onMouseLeave}>
      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 pb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className={cn(UI_SM, "text-center text-[#6F6F6F]")}>
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for offset */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${String(i)}`} className="aspect-square min-h-[40px]" />
        ))}

        {days.map((date) => {
          const disabled = isBefore(date, minDate)
          const isStart = checkIn !== null && isSameDay(date, checkIn)
          const isEnd = effectiveEnd !== null && isSameDay(date, effectiveEnd)
          const isHoverEnd = hoverDate !== null && !checkOut && isSameDay(date, hoverDate)
          const isToday = isSameDay(date, today)

          // Range logic
          let inRange = false
          if (checkIn && effectiveEnd && isAfter(date, checkIn) && isBefore(date, effectiveEnd)) {
            inRange = true
          }

          // Border radius logic for range
          const isFirstDayOfMonth = date.getDate() === 1
          const isLastDayOfMonth = isSameDay(date, monthEnd)
          const isMonday = getDay(date) === 1
          const isSunday = getDay(date) === 0

          // Determine style
          let btnBg = "transparent"
          let textColor = "#202020"
          let fontWeight = 500

          if (disabled) {
            textColor = "#202020"
          } else if (isStart || (isEnd && !isHoverEnd)) {
            btnBg = "#222222"
            textColor = "white"
            fontWeight = 600
          } else if (isHoverEnd) {
            btnBg = "#222222"
            textColor = "white"
            fontWeight = 600
          } else if (inRange) {
            btnBg = "#F7F7F7"
          }

          // Range background on the cell — use radial mask to avoid square corners under circles
          const hasRange = checkIn && effectiveEnd && !isSameDay(checkIn, effectiveEnd)
          let cellBg = "transparent"
          if (inRange && !isStart && !isEnd && !isHoverEnd) {
            cellBg = "#F7F7F7"
          } else if (isStart && hasRange) {
            cellBg = "linear-gradient(to right, transparent 50%, #F7F7F7 50%)"
          } else if ((isEnd || isHoverEnd) && hasRange) {
            cellBg = "linear-gradient(to left, transparent 50%, #F7F7F7 50%)"
          }

          // Hover state: border when nothing selected, solid fill when picking end
          const hasSelection = checkIn !== null
          const isPlainDay = !isStart && !isEnd && !isHoverEnd && !inRange && !disabled

          return (
            <div
              key={date.toISOString()}
              className="aspect-square min-h-[40px]"
              style={{ background: cellBg }}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onDayClick(date)}
                onMouseEnter={() => !disabled && onDayHover(date)}
                className={cn(
                  "relative flex size-full cursor-pointer items-center justify-center",
                  disabled && "pointer-events-none opacity-[0.28]",
                )}
                style={{
                  fontSize: 14,
                  fontWeight,
                  borderRadius: 5000,
                  backgroundColor: btnBg,
                  color: textColor,
                  border: isPlainDay && !hasSelection ? undefined : "none",
                }}
                onMouseOver={(e) => {
                  if (disabled || isStart || isEnd || isHoverEnd || inRange) return
                  if (!hasSelection) {
                    e.currentTarget.style.border = "1px solid #222222"
                  }
                }}
                onMouseOut={(e) => {
                  if (disabled || isStart || isEnd || isHoverEnd || inRange) return
                  e.currentTarget.style.border = "none"
                }}
              >
                {String(date.getDate())}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Standalone panel (used by SearchForm unified panel) ────

interface DateRangePanelProps {
  checkIn: Date | null
  checkOut: Date | null
  onRangeChange: (checkIn: Date | null, checkOut: Date | null) => void
  minDate: Date
  viewMonth: Date
  onViewMonthChange: (d: Date) => void
  hoverDate: Date | null
  onHoverDateChange: (d: Date | null) => void
}

export function DateRangePanel({
  checkIn,
  checkOut,
  onRangeChange,
  minDate,
  viewMonth,
  onViewMonthChange,
  hoverDate,
  onHoverDateChange,
}: DateRangePanelProps): React.ReactElement {
  const today = startOfDay(new Date())
  const canGoPrev = isAfter(viewMonth, startOfMonth(today))

  const viewMonthLabel = format(viewMonth, "MMMM yyyy", { locale: sv })
  const nextMonthLabel = format(addMonths(viewMonth, 1), "MMMM yyyy", { locale: sv })
  const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

  const nightCount = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : null

  const handleDayClick = useCallback(
    (date: Date) => {
      if (!checkIn || (checkIn && checkOut)) {
        onRangeChange(date, null)
        onHoverDateChange(null)
      } else if (isBefore(date, checkIn) || isSameDay(date, checkIn)) {
        onRangeChange(date, null)
        onHoverDateChange(null)
      } else {
        onRangeChange(checkIn, date)
        onHoverDateChange(null)
      }
    },
    [checkIn, checkOut, onRangeChange, onHoverDateChange]
  )

  const handleDayHover = useCallback(
    (date: Date) => {
      if (checkIn && !checkOut && isAfter(date, checkIn)) onHoverDateChange(date)
      else onHoverDateChange(null)
    },
    [checkIn, checkOut, onHoverDateChange]
  )

  return (
    <div className="p-8" style={{ "--dp-accent": "#207EA9", "--dp-accent-range": "rgba(32, 126, 169, 0.10)" } as React.CSSProperties}>
      <div className="mb-5 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
        <div className="grid grid-cols-[36px_1fr_36px] items-center">
          <button type="button" onClick={() => canGoPrev && onViewMonthChange(addMonths(viewMonth, -1))} disabled={!canGoPrev} className={cn("flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white transition-all duration-300", canGoPrev ? "cursor-pointer opacity-100 hover:border-slate-400" : "pointer-events-none cursor-default opacity-0")} aria-label={TEXT.PREV_MONTH}><Icon name="chevron_left" size={20} /></button>
          <span className="text-center font-semibold text-[#202020]" style={{ fontSize: 16 }}>{cap(viewMonthLabel)}</span>
          <span className="md:hidden"><button type="button" onClick={() => onViewMonthChange(addMonths(viewMonth, 1))} className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white transition-all duration-200 hover:border-slate-400" aria-label={TEXT.NEXT_MONTH}><Icon name="chevron_right" size={20} /></button></span>
          <span className="hidden md:block" />
        </div>
        <div className="hidden items-center md:grid md:grid-cols-[36px_1fr_36px]">
          <span />
          <span className="text-center font-semibold text-[#202020]" style={{ fontSize: 16 }}>{cap(nextMonthLabel)}</span>
          <button type="button" onClick={() => onViewMonthChange(addMonths(viewMonth, 1))} className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white transition-all duration-200 hover:border-slate-400" aria-label={TEXT.NEXT_MONTH}><Icon name="chevron_right" size={20} /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <MonthGrid month={viewMonth} checkIn={checkIn} checkOut={checkOut} hoverDate={hoverDate} minDate={minDate} today={today} onDayClick={handleDayClick} onDayHover={handleDayHover} onMouseLeave={() => onHoverDateChange(null)} />
        <div className="hidden md:block">
          <MonthGrid month={addMonths(viewMonth, 1)} checkIn={checkIn} checkOut={checkOut} hoverDate={hoverDate} minDate={minDate} today={today} onDayClick={handleDayClick} onDayHover={handleDayHover} onMouseLeave={() => onHoverDateChange(null)} />
        </div>
      </div>
    </div>
  )
}
