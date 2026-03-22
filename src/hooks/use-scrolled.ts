"use client"

import { useState, useEffect } from "react"

export function useScrolled(threshold = 10): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function handleScroll(): void {
      setScrolled(window.scrollY > threshold)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [threshold])

  return scrolled
}
