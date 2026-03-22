"use client"

import { useRef, useState, useEffect, useCallback, createContext, useContext, Suspense } from "react"
import { usePathname } from "next/navigation"
import { Icon } from "@/components/ui/icon"
import { SearchForm } from "@/components/booking/search-form"

const LOGO_URL = "https://resources.citybreak.com/bookvisit/apelviken/logo.svg"

const NAV_ITEMS = [
  { label: "Boka", href: "/" },
  { label: "Paket", href: "/paket" },
  { label: "Presentkort", href: "/presentkort" },
  { label: "Hitta bokning", href: "/hitta-bokning" },
  { label: "Rabattkod", href: "/rabattkod" },
] as const

// ─── Expanded routes — everything else is compact ───────────
const EXPANDED_ROUTES = ["/"]

// ─── Contexts for SearchForm ────────────────────────────────
const StuckContext = createContext(false)
const OverlayControlContext = createContext<(visible: boolean) => void>(() => {})

export function useIsStuck(): boolean {
  return useContext(StuckContext)
}

export function useOverlayControl(): (visible: boolean) => void {
  return useContext(OverlayControlContext)
}

const MOTION_DURATION = 350
const MOTION_EASE = "cubic-bezier(0.33, 1, 0.68, 1)"

// ─── Header ─────────────────────────────────────────────────
export function Header(): React.ReactElement {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [scrollStuck, setScrollStuck] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const pathname = usePathname()

  // Expanded only on explicit routes, compact everywhere else
  const isExpandedRoute = EXPANDED_ROUTES.includes(pathname)
  const isStuck = !isExpandedRoute || scrollStuck

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setScrollStuck(!entry.isIntersecting)
      },
      { threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const setOverlay = useCallback((visible: boolean) => {
    setOverlayVisible(visible)
  }, [])

  return (
    <StuckContext.Provider value={isStuck}>
      <OverlayControlContext.Provider value={setOverlay}>
        {/* Sentinel — when it scrolls out of view, header becomes "stuck" */}
        <div ref={sentinelRef} className="h-0 w-full" />

        <header
          className="sticky top-0 z-50 w-full"
          style={{
            background: "var(--search-input_background, linear-gradient(180deg, #ffffff 39.9%, #f8f8f8 100%))",
            borderBottom: "1px solid #ddd",
            boxShadow: "none",
            paddingTop: 18,
            paddingBottom: 18,
          }}
        >
          <div className="mx-auto flex max-w-[1250px] items-start px-4 md:px-8">
            {/* Logo — centered with nav in expanded, fixed height in compact */}
            <a
              href="/"
              className="flex shrink-0 items-center"
              style={{
                height: isStuck ? 42 : "auto",
                paddingBottom: isStuck ? 0 : 16,
                transition: `height ${String(MOTION_DURATION)}ms ${MOTION_EASE}, padding-bottom ${String(MOTION_DURATION)}ms ${MOTION_EASE}`,
              }}
            >
              <img src={LOGO_URL} alt="Apelviken" className="h-8 w-auto md:h-9" />
            </a>

            {/* Center: nav (collapses) + search (morphs) stacked */}
            <div className="flex min-w-0 flex-1 flex-col items-center">
              {/* Nav — collapses height when stuck */}
              <div
                className="w-full overflow-hidden"
                style={{
                  maxHeight: isStuck ? 0 : 60,
                  opacity: isStuck ? 0 : 1,
                  transition: isStuck
                    ? `max-height ${String(MOTION_DURATION)}ms ${MOTION_EASE}, opacity ${String(Math.round(MOTION_DURATION * 0.4))}ms ${MOTION_EASE}`
                    : `max-height 450ms ${MOTION_EASE}, opacity 300ms ease ${String(200)}ms`,
                }}
              >
                <nav className="hidden items-center justify-center gap-1 pb-4 md:flex">
                  {NAV_ITEMS.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-[#202020] transition-colors duration-150 hover:bg-black/[0.04]"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Search — always visible */}
              <div
                style={{
                  width: "100%",
                  maxWidth: 850,
                  transition: `max-width ${String(MOTION_DURATION)}ms ${MOTION_EASE}`,
                }}
              >
                <Suspense><SearchForm /></Suspense>
              </div>
            </div>

            {/* Icons — centered with nav in expanded, fixed height in compact */}
            <div
              className="flex shrink-0 items-center gap-1"
              style={{
                height: isStuck ? 42 : "auto",
                paddingBottom: isStuck ? 0 : 16,
                transition: `height ${String(MOTION_DURATION)}ms ${MOTION_EASE}, padding-bottom ${String(MOTION_DURATION)}ms ${MOTION_EASE}`,
              }}
            >
              <button
                type="button"
                aria-label="Byt språk"
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#202020] transition-colors duration-150 hover:bg-black/[0.04]"
              >
                <Icon name="language" size={22} />
              </button>
              <button
                type="button"
                aria-label="Varukorg"
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#202020] transition-colors duration-150 hover:bg-black/[0.04]"
              >
                <Icon name="shopping_bag" size={22} />
              </button>
            </div>
          </div>
        </header>

        {/* Overlay — behind header in z-order */}
        <div
          className="fixed inset-0 z-40"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            opacity: overlayVisible && isStuck ? 1 : 0,
            pointerEvents: overlayVisible && isStuck ? "auto" : "none",
            transition: "opacity 200ms ease",
          }}
        />
      </OverlayControlContext.Provider>
    </StuckContext.Provider>
  )
}
