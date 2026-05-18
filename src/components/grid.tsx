import React from 'react'
import { clsx } from 'clsx'

interface GridProps {
  children: React.ReactNode
  className?: string
  /** Gap between grid items - provide full Tailwind classes like 'gap-4' or 'gap-2 lg:gap-6' */
  gap?: string
  /** Grid columns configuration - provide full Tailwind classes like 'grid-cols-2 lg:grid-cols-4' to override default */
  cols?: string
}

export function Grid({ children, className, gap = '', cols = '' }: GridProps) {
  // Use cols override if provided, otherwise use default
  const finalCols = cols || 'grid-cols-1 lg:grid-cols-3'
  // Use gap override if provided, otherwise use default
  const finalGap = gap || 'gap-20 lg:gap-20 xl:gap-20'

  return (
    <div className={clsx('grid', finalCols, finalGap, className)}>
      {children}
    </div>
  )
}
