'use client'

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { clsx } from 'clsx'

interface MasonryProps {
  children: ReactNode
  className?: string
  /** Gap between items (default: 32px) - if gapX/gapY not specified */
  gap?: number
  /** Horizontal gap between columns (default: uses gap value) */
  gapX?: number
  /** Vertical gap between items (default: uses gap value) */
  gapY?: number
  /** Custom breakpoints for columns */
  breakpoints?: {
    default: number
    lg?: number
    md?: number
    sm?: number
  }
}

export function Masonry({
  children,
  className,
  gap = 32,
  gapX,
  gapY,
  breakpoints = {
    default: 3,
    lg: 2,
    md: 2,
    sm: 1,
  },
}: MasonryProps) {
  // Use specific gap values or fall back to general gap
  const horizontalGap = gapX ?? gap
  const verticalGap = gapY ?? gap
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [columns, setColumns] = useState(breakpoints.default)
  const [isMasonryEnabled, setIsMasonryEnabled] = useState(true)
  const [containerHeight, setContainerHeight] = useState(0)
  const [layoutKey, setLayoutKey] = useState(0)

  // Convert children to array for easier handling
  const childrenArray = Array.isArray(children) ? children : [children]

  // Calculate number of columns based on screen width
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      let newColumns = breakpoints.default

      if (width < 640) {
        newColumns = breakpoints.sm || 1
      } else if (width < 768) {
        newColumns = breakpoints.md || 2
      } else if (width < 1024) {
        newColumns = breakpoints.lg || 2
      } else {
        newColumns = breakpoints.default
      }

      setColumns(newColumns)
      setIsMasonryEnabled(newColumns > 1)
    }

    updateColumns()

    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        updateColumns()
        setLayoutKey((prev) => prev + 1)
      }, 150)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [breakpoints])

  // Layout calculation
  const calculateLayout = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const containerWidth = container.offsetWidth

    if (!isMasonryEnabled) {
      // Simple single column layout
      itemRefs.current.forEach((item) => {
        if (!item) return

        item.style.position = 'relative'
        item.style.left = 'auto'
        item.style.top = 'auto'
        item.style.width = '100%'
        item.style.maxWidth = '100%'
        item.style.marginBottom = `${verticalGap}px`
      })

      setContainerHeight(0)
      return
    }

    // Masonry layout for multi-column
    const availableWidth = Math.max(
      containerWidth - horizontalGap * (columns - 1),
      columns * 200
    )
    const columnWidth = availableWidth / columns
    const columnHeights = new Array(columns).fill(0)

    itemRefs.current.forEach((item) => {
      if (!item) return

      // Find the shortest column
      const shortestColumnIndex = columnHeights.indexOf(
        Math.min(...columnHeights)
      )

      // Position the item
      const x = shortestColumnIndex * (columnWidth + horizontalGap)
      const y = columnHeights[shortestColumnIndex]

      item.style.position = 'absolute'
      item.style.left = `${Math.min(x, containerWidth - columnWidth)}px`
      item.style.top = `${y}px`
      item.style.width = `${columnWidth}px`
      item.style.maxWidth = '100%'
      item.style.marginBottom = '0'

      // Update column height
      columnHeights[shortestColumnIndex] += item.offsetHeight + verticalGap
    })

    // Set container height for masonry (subtract final gap since last items don't need gap below)
    const maxHeight = Math.max(...columnHeights)
    setContainerHeight(maxHeight > 0 ? maxHeight - verticalGap : 0)
  }, [columns, isMasonryEnabled, horizontalGap, verticalGap])

  // Recalculate layout when children change or images load
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateLayout()
    }, 100)

    return () => clearTimeout(timer)
  }, [calculateLayout, layoutKey, childrenArray.length])

  return (
    <div
      ref={containerRef}
      className={clsx(
        'w-full relative',
        {
          'overflow-hidden': isMasonryEnabled,
          'space-y-8': !isMasonryEnabled,
        },
        className
      )}
      style={{
        ...(isMasonryEnabled ? { height: `${containerHeight}px` } : {}),
      }}
    >
      {childrenArray.map((child, index) => (
        <div
          key={index}
          ref={(el) => {
            itemRefs.current[index] = el
            if (el && el.offsetHeight > 0 && isMasonryEnabled) {
              setTimeout(() => calculateLayout(), 50)
            }
          }}
          className={clsx('transition-all duration-300 ease-in-out', {
            absolute: isMasonryEnabled,
            relative: !isMasonryEnabled,
          })}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
