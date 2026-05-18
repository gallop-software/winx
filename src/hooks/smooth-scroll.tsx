'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { state } from '@/state'

const SmoothScroll = () => {
  const offset = 40
  const pathname = usePathname()

  useEffect(() => {
    if (!sessionStorage.getItem('entryHistoryLength')) {
      sessionStorage.setItem('entryHistoryLength', String(window.history.length))
    }

    const getScrollContainer = (el: Element): Element | Window => {
      let parent = el.parentElement
      while (parent) {
        const style = getComputedStyle(parent)
        if (
          /(auto|scroll|overlay)/.test(style.overflowY) &&
          parent.scrollHeight > parent.clientHeight
        ) {
          return parent
        }
        parent = parent.parentElement
      }
      return window
    }

    const smoothScroll = (hash: string) => {
      const targetElement = document.querySelector(hash) as HTMLElement | null
      if (targetElement) {
        state.scrollingDirection = 'down'
        state.lockScrollDirection = true

        window.addEventListener(
          'scrollend',
          () => {
            state.lockScrollDirection = false
          },
          { once: true }
        )

        const tagName = targetElement.tagName.toLowerCase()
        const scrollOffset =
          tagName === 'div' || tagName === 'section' ? 0 : offset

        const container = getScrollContainer(targetElement)
        if (container instanceof Window) {
          window.scrollTo({
            top:
              targetElement.getBoundingClientRect().top +
              window.scrollY -
              scrollOffset,
            behavior: 'smooth',
          })
        } else {
          const containerEl = container as HTMLElement
          const targetTop =
            targetElement.getBoundingClientRect().top -
            containerEl.getBoundingClientRect().top +
            containerEl.scrollTop -
            scrollOffset
          containerEl.scrollTo({ top: targetTop, behavior: 'smooth' })
        }

        history.pushState(null, '', hash)
      }
    }

    // Main links: preventDefault for smooth scroll
    const handleMainClick = (event: MouseEvent) => {
      const anchor = event.currentTarget as HTMLAnchorElement
      const hash = anchor.hash
      if (!hash) return

      const targetElement = document.querySelector(hash)
      if (targetElement) {
        event.preventDefault()
        smoothScroll(hash)
      }
    }

    // Header links: no preventDefault (allows CloseButton to work)
    const handleHeaderClick = (event: MouseEvent) => {
      const anchor = event.currentTarget as HTMLAnchorElement
      const hash = anchor.hash
      if (!hash) return

      smoothScroll(hash)
    }

    const attachListeners = () => {
      const mainLinks = document.querySelectorAll<HTMLAnchorElement>(
        'body main a[href^="#"]:not(.no-anchor-scroll)'
      )
      const headerLinks = document.querySelectorAll<HTMLAnchorElement>(
        'body header a[href^="#"]:not(.no-anchor-scroll)'
      )

      mainLinks.forEach((link) => {
        if (!link.dataset.smoothScrollAttached) {
          link.addEventListener('click', handleMainClick)
          link.dataset.smoothScrollAttached = 'true'
        }
      })

      headerLinks.forEach((link) => {
        if (!link.dataset.smoothScrollAttached) {
          link.addEventListener('click', handleHeaderClick)
          link.dataset.smoothScrollAttached = 'true'
        }
      })
    }

    // Initial attachment
    attachListeners()

    // Observe for new links being added to DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        attachListeners() // Re-attach to any new anchors
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      // Clean up MutationObserver
      observer.disconnect()

      // Clean up listeners
      const mainLinks = document.querySelectorAll<HTMLAnchorElement>(
        'body main a[href^="#"]:not(.no-anchor-scroll)'
      )
      const headerLinks = document.querySelectorAll<HTMLAnchorElement>(
        'body header a[href^="#"]:not(.no-anchor-scroll)'
      )

      mainLinks.forEach((link) => {
        if (link.dataset.smoothScrollAttached) {
          link.removeEventListener('click', handleMainClick)
          delete link.dataset.smoothScrollAttached
        }
      })

      headerLinks.forEach((link) => {
        if (link.dataset.smoothScrollAttached) {
          link.removeEventListener('click', handleHeaderClick)
          delete link.dataset.smoothScrollAttached
        }
      })
    }
  }, [pathname])

  return null
}

export default SmoothScroll
