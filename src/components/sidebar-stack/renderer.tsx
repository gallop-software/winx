'use client'

import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react'
import clsx from 'clsx'
import xMarkIcon from '@iconify/icons-heroicons/x-mark'
import { Icon } from '@/components/icon'
import { useSidebarStack, type SidebarItem } from './context'

/** Lock body scroll when sidebar is open */
function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isLocked])
}

/** Sidebar level classes - each level shifts 24px left */
const LEVEL_CLASSES: Record<number, string> = {
  0: 'translate-x-0',
  1: '-translate-x-6',
  2: '-translate-x-12',
  3: '-translate-x-[72px]',
  4: '-translate-x-24',
}

/** Z-index classes for stacking */
const Z_INDEX_CLASSES: Record<number, string> = {
  0: 'z-[59]',
  1: 'z-[58]',
  2: 'z-[57]',
  3: 'z-[56]',
  4: 'z-[55]',
}

interface SidebarPanelProps {
  item: SidebarItem
  level: number
  isActive: boolean
  isClosing: boolean
  onClose: (id: string) => void
  renderContent: (componentId: string) => ReactNode
}

/** Individual sidebar panel with stacking visual effects */
function SidebarPanel({
  item,
  level,
  isActive,
  isClosing,
  onClose,
  renderContent,
}: SidebarPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [titleOpacity, setTitleOpacity] = useState(
    item.showTitleImmediately ? 1 : 0
  )

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  // Track scroll position to fade in title (skip if showTitleImmediately)
  useEffect(() => {
    if (item.showTitleImmediately) return

    const panel = panelRef.current
    if (!panel) return

    const handleScroll = () => {
      const scrollTop = panel.scrollTop
      // Hidden until 50px, then fade from 0 to 1 between 51-100px
      const opacity = scrollTop <= 50 ? 0 : Math.min((scrollTop - 50) / 50, 1)
      setTitleOpacity(opacity)
    }

    panel.addEventListener('scroll', handleScroll, { passive: true })
    return () => panel.removeEventListener('scroll', handleScroll)
  }, [item.showTitleImmediately])

  const clampedLevel = Math.min(level, 4)

  return (
    <div
      className={clsx(
        'fixed inset-y-0 right-0 flex flex-col',
        'max-w-[86%] md:max-w-[77%] lg:max-w-[67%] xl:max-w-[700px] w-full',
        'transition-transform duration-500 ease-out',
        Z_INDEX_CLASSES[clampedLevel],
        isClosing
          ? 'translate-x-full'
          : !isVisible
            ? 'translate-x-full'
            : LEVEL_CLASSES[clampedLevel],
        !isActive && 'pointer-events-none'
      )}
    >
      <div
        ref={panelRef}
        className={clsx(
          'h-full bg-body overflow-y-auto scrollbar-hide',
          isActive ? 'shadow-2xl' : 'shadow-xl'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-body/95 backdrop-blur-sm border-b border-accent3-dark">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <h2
              className="text-base font-semibold text-contrast truncate transition-opacity duration-150"
              style={{ opacity: titleOpacity }}
            >
              {item.title}
            </h2>
            <button
              type="button"
              className="rounded-full h-10 w-10 flex items-center justify-center cursor-pointer hover:bg-body-light transition-colors shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                onClose(item.id)
              }}
              aria-label={`Close ${item.title}`}
            >
              <Icon
                icon={xMarkIcon}
                className="h-5 w-5 text-contrast-light"
              />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 md:px-8 py-6">
          {renderContent(item.componentId)}
        </div>
      </div>
    </div>
  )
}

export interface SidebarStackRendererProps {
  renderContent: (componentId: string) => ReactNode
}

/** Renders sidebar stack with shared backdrop */
export function SidebarStackRenderer({
  renderContent,
}: SidebarStackRendererProps) {
  const { stack, close, isOpen } = useSidebarStack()
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set())
  const [shouldRender, setShouldRender] = useState(false)

  const activeItems = stack.filter((item) => !closingIds.has(item.id))
  const hasClosing = closingIds.size > 0

  useBodyScrollLock(isOpen || hasClosing)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen && shouldRender && !hasClosing) {
      setShouldRender(false)
    }
  }, [isOpen, shouldRender, hasClosing])

  const handleClose = useCallback(
    (id: string) => {
      setClosingIds((prev) => new Set(prev).add(id))
      setTimeout(() => {
        close(id)
        setClosingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 500)
    },
    [close]
  )

  const handleBackdropClick = () => {
    const topItem = activeItems[activeItems.length - 1]
    if (topItem) handleClose(topItem.id)
  }

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        const topItem = activeItems[activeItems.length - 1]
        if (topItem) handleClose(topItem.id)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeItems, handleClose])

  if (!shouldRender) return null

  const isLastClosing = activeItems.length === 0 && hasClosing

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-body/50 backdrop-blur-md transition-opacity duration-500',
          isLastClosing ? 'opacity-0' : 'opacity-100'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Sidebar panels */}
      {stack.map((item) => {
        const isClosing = closingIds.has(item.id)
        const activeIndex = activeItems.findIndex((i) => i.id === item.id)
        const level = isClosing ? 0 : activeItems.length - 1 - activeIndex
        const isActive = !isClosing && activeIndex === activeItems.length - 1

        return (
          <SidebarPanel
            key={item.id}
            item={item}
            level={level}
            isActive={isActive}
            isClosing={isClosing}
            onClose={handleClose}
            renderContent={renderContent}
          />
        )
      })}
    </>
  )
}
