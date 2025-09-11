import { useState, useEffect } from "react"

/**
 * Hook to detect if user prefers reduced motion
 * Returns true if user has requested reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if browser supports matchMedia
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
      
      // Set initial value
      setPrefersReducedMotion(mediaQuery.matches)

      // Create event listener function
      const handleChange = (event: MediaQueryListEvent) => {
        setPrefersReducedMotion(event.matches)
      }

      // Add event listener
      mediaQuery.addEventListener("change", handleChange)

      // Cleanup function
      return () => {
        mediaQuery.removeEventListener("change", handleChange)
      }
    }
  }, [])

  return prefersReducedMotion
}