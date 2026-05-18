'use client'

import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react'
import clsx from 'clsx'
import xMarkIcon from '@iconify/icons-heroicons/x-mark'
import { Icon } from '@/components/icon'
import { useSidebarStack, type SidebarItem } from './context'
import { ShareBar } from '@/components/share-bar'

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

/** Loading spinner component */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
    </div>
  )
}

/** Error display component */
function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] text-red-500">
      <p>{message}</p>
    </div>
  )
}

interface AsyncSidebarPanelProps {
  item: SidebarItem
  level: number
  isActive: boolean
  isClosing: boolean
  onClose: (id: string) => void
}

/** Individual sidebar panel with async content loading */
function AsyncSidebarPanel({
  item,
  level,
  isActive,
  isClosing,
  onClose,
}: AsyncSidebarPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [content, setContent] = useState<ReactNode>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [titleOpacity] = useState(1)

  const { contentLoader, contentCache, setCachedContent, push } =
    useSidebarStack()

  // Load content on mount
  useEffect(() => {
    const loadContent = async () => {
      // Guard against undefined componentId
      if (!item.componentId) {
        setError('No component ID provided')
        setIsLoading(false)
        return
      }

      // Check cache first
      const cached = contentCache.get(item.componentId)
      if (cached) {
        setContent(cached)
        setIsLoading(false)
        return
      }

      if (!contentLoader) {
        setError('No content loader configured')
        setIsLoading(false)
        return
      }

      try {
        const loadedContent = await contentLoader(item.componentId)
        setContent(loadedContent)
        setCachedContent(item.componentId, loadedContent)
        setIsLoading(false)
      } catch (err) {
        console.error(`Failed to load content for ${item.componentId}:`, err)
        setError('Failed to load content')
        setIsLoading(false)
      }
    }

    loadContent()
  }, [item.componentId, contentLoader, contentCache, setCachedContent])

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])


  // Handle clicks on links within content
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const link = target.closest('a')

    if (!link) return

    const href = link.getAttribute('href')
    if (!href) return

    // Check for explicit sidebar component attribute
    const sidebarComponent = link.getAttribute('data-sidebar-component')
    if (sidebarComponent) {
      e.preventDefault()
      e.stopPropagation()
      const title = link.getAttribute('data-sidebar-title') || ''
      push({ title, componentId: sidebarComponent, url: href })
      return
    }

    // Check for blog post links (/YYYY/MM/slug)
    const blogPostMatch = href.match(/^\/(\d{4})\/(\d{2})\/([^\/\?#]+)/)
    if (blogPostMatch) {
      e.preventDefault()
      e.stopPropagation()
      const slug = blogPostMatch[3] ?? ''
      if (!slug) return
      const title = link.textContent?.trim() || slug
      const url = `${process.env.NEXT_PUBLIC_PRODUCTION_URL ?? ''}/${blogPostMatch[1]}/${blogPostMatch[2]}/${slug}`
      push({ title, componentId: slug, url })
      return
    }

    // Allow all other links (external, other internal pages) to navigate normally
  }

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
        <div
          className="px-4 md:px-8 pb-6"
          onClickCapture={handleContentClick}
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorDisplay message={error} />
          ) : (
            <>
              {item.url && <ShareBar title={item.title} slug={item.componentId} url={item.url} />}
              <div>{content}</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Renders sidebar stack with async content loading */
export function AsyncSidebarRenderer() {
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
          <AsyncSidebarPanel
            key={item.id}
            item={item}
            level={level}
            isActive={isActive}
            isClosing={isClosing}
            onClose={handleClose}
          />
        )
      })}
    </>
  )
}
