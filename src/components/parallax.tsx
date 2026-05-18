'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

// Parallax speed presets (percentage of scroll to translate)
const PARALLAX_SPEEDS = {
  slow: 15,
  medium: 30,
  fast: 50,
}

export type ParallaxSpeed = 'slow' | 'medium' | 'fast'

interface ParallaxProps {
  children: ReactNode
  speed?: ParallaxSpeed
  className?: string
}

// Tailwind lg breakpoint
const LG_BREAKPOINT = 1024

function useIsLargeScreen() {
  const [isLarge, setIsLarge] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`)
    setIsLarge(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setIsLarge(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return isLarge
}

export function Parallax({
  children,
  speed = 'medium',
  className,
}: ParallaxProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isLargeScreen = useIsLargeScreen()

  // Track scroll progress relative to this element
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const parallaxAmount = PARALLAX_SPEEDS[speed]

  // Transform scroll progress to Y translation
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`-${parallaxAmount}%`, `${parallaxAmount}%`]
  )

  // Calculate sizing based on parallax amount
  // Extra height = 100% + (2 * parallaxAmount) to cover movement in both directions
  // Top offset = -parallaxAmount to center the extra height
  const extraHeight = 100 + parallaxAmount * 2
  const topOffset = -parallaxAmount

  return (
    <div
      ref={containerRef}
      className={className}
    >
      {isLargeScreen ? (
        <motion.div
          className="absolute inset-x-0 *:absolute *:inset-0 *:w-full *:h-full *:object-cover"
          style={{
            y,
            height: `${extraHeight}%`,
            top: `${topOffset}%`,
          }}
        >
          {children}
        </motion.div>
      ) : (
        <div className="absolute inset-0 *:absolute *:inset-0 *:w-full *:h-full *:object-cover">
          {children}
        </div>
      )}
    </div>
  )
}
