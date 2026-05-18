import clsx from 'clsx'
import React from 'react'

interface AccentProps {
  children: React.ReactNode
  className?: string
  /** Size preset for default text sizing */
  size?: 'small' | 'medium' | 'large'
  /** Font size override */
  fontSize?: string
  /** Text color override */
  color?: string
  /** Font family override */
  fontFamily?: string
  /** Margin override */
  margin?: string
  /** Overflow fix padding/margin to prevent Safari text clipping */
  overflowFix?: string
  /** Text alignment (Tailwind CSS classes) */
  textAlign?: string
  /** Text transform (Tailwind CSS classes) */
  textTransform?: string
  /** Display (Tailwind CSS classes) */
  display?: string
}

export function Accent({
  children,
  className = '',
  size = 'large',
  fontSize = '',
  color = '',
  fontFamily = '',
  margin = '',
  overflowFix = '',
  textAlign = '',
  textTransform = 'lowercase',
  display = 'inline-block',
}: AccentProps) {
  // Define font size presets
  const sizeClasses = {
    small: 'text-3xl sm:text-3xl lg:text-4xl xl:text-5xl',
    medium: 'text-4xl sm:text-4xl lg:text-5xl xl:text-6xl',
    large: 'text-5xl sm:text-6xl lg:text-7xl xl:text-8xl',
  }

  // Use user-defined values if provided, otherwise use defaults
  const finalFontSize = fontSize || sizeClasses[size]
  const finalColor = color || 'text-accent5'
  const finalFontFamily = fontFamily || 'font-accent'
  const finalMargin = margin || 'mb-0'
  const finalOverflowFix = overflowFix || 'px-2 -ml-2'

  // Add subtle drop shadow for white text to improve readability
  const textShadow =
    finalColor === 'text-body' ? 'text-shadow-sm text-shadow-contrast/10' : ''

  return (
    <span
      className={clsx(
        'font-normal',
        display,
        // Apply final styles (user-defined or defaults)
        finalFontSize,
        finalColor,
        finalFontFamily,
        finalMargin,
        finalOverflowFix,
        textAlign,
        textTransform,
        textShadow,
        // Custom className can override or extend default styles
        className
      )}
    >
      {children}
    </span>
  )
}
