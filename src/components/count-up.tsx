'use client'

import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion'
import { useEffect, useRef } from 'react'

interface CountUpProps {
  start?: number
  end: number
  decimals?: number
  duration?: number
  delay?: number
  prefix?: string
  suffix?: string
  separator?: string
  decimal?: string
  className?: string
}

export function CountUp({
  start = 0,
  end,
  decimals = 0,
  duration = 2,
  delay = 0,
  prefix = '',
  suffix = '',
  separator = '',
  decimal = '.',
  className = '',
}: CountUpProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  const value = useMotionValue(start)

  // Convert duration to spring physics (higher duration = lower stiffness)
  const stiffness = Math.max(50, 150 / duration)
  const damping = Math.max(20, 40 / duration)

  const spring = useSpring(value, { damping, stiffness })

  const display = useTransform(spring, (num) => {
    const fixed = num.toFixed(decimals)
    const [intPart = '0', decPart] = fixed.split('.')

    // Add separator to integer part if provided
    const formattedInt = separator
      ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
      : intPart

    // Reconstruct with custom decimal point
    const formatted = decPart
      ? `${formattedInt}${decimal}${decPart}`
      : formattedInt

    return `${prefix}${formatted}${suffix}`
  })

  useEffect(() => {
    if (!isInView) return
    const timeout = setTimeout(() => {
      value.set(end)
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [isInView, end, delay, value])

  return (
    <motion.span
      ref={ref}
      className={className}
    >
      {display}
    </motion.span>
  )
}
