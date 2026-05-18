import React from 'react'
import { clsx } from 'clsx'

interface ColumnsProps {
  children: React.ReactNode
  className?: string
  /** Gap between columns - provide full Tailwind classes like 'gap-4 lg:gap-8' */
  gap?: string
  /** Grid columns - provide full Tailwind classes like 'grid-cols-1 lg:grid-cols-2' */
  cols?: string
  /** Alignment - provide full Tailwind classes like 'items-center' */
  align?: string
  reverseColumns?: boolean
}

function getColumnsDefaults() {
  return {
    gap: 'gap-20 lg:gap-20',
    cols: 'grid-cols-1 lg:grid-cols-2',
    align: 'items-center',
  }
}

export function Columns({
  children,
  className,
  gap = '',
  cols = '',
  align = '',
  reverseColumns = false,
}: ColumnsProps) {
  const defaults = getColumnsDefaults()

  // Use user-defined values if provided, otherwise use defaults
  const finalGap = gap || defaults.gap
  const finalCols = cols || defaults.cols
  const finalAlign = align || defaults.align

  const getReverseClasses = () => {
    if (!reverseColumns) return ''

    // Simple reverse for two-column layouts on large screens
    return 'lg:[&>*:nth-child(odd)]:order-2 lg:[&>*:nth-child(even)]:order-1'
  }

  return (
    <div
      className={clsx(
        'grid',
        finalCols,
        finalGap,
        finalAlign,
        getReverseClasses(),
        className
      )}
    >
      {children}
    </div>
  )
}

interface ColumnProps {
  children: React.ReactNode
  className?: string
}

export function Column({ children, className }: ColumnProps) {
  return (
    <div className={clsx('[&>*:last-child]:mb-0', className)}>{children}</div>
  )
}
