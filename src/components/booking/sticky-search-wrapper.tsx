"use client"

import { useRef, useState, useEffect, createContext, useContext, useCallback } from "react"

const StuckContext = createContext(false)
const OverlayContext = createContext<{ show: boolean; close: () => void }>({ show: false, close: () => {} })

export function useIsStuck(): boolean {
  return useContext(StuckContext)
}

export function useOverlay(): { showOverlay: () => void; hideOverlay: () => void } {
  const ctx = useContext(OverlayContext)
  return { showOverlay: () => {}, hideOverlay: ctx.close }
}

// Separate context for SearchForm to control overlay
const OverlayControlContext = createContext<(visible: boolean) => void>(() => {})

export function useOverlayControl(): (visible: boolean) => void {
  return useContext(OverlayControlContext)
}

interface StickySearchWrapperProps {
  children: React.ReactNode
}

export function StickySearchWrapper({ children }: StickySearchWrapperProps): React.ReactElement {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsStuck(!entry.isIntersecting)
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
        <div ref={sentinelRef} className="h-0 w-full" />
        <div
          className="sticky top-0 z-50 w-full bg-white py-6 transition-shadow duration-200"
          style={{ boxShadow: isStuck ? "0 2px 12px rgba(0,0,0,0.08)" : "none" }}
        >
          {children}
        </div>
        {/* Overlay — rendered AFTER sticky div so it's behind it in z-order */}
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
