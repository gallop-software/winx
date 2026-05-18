import { useEffect } from 'react'
import { state } from '@/state'

// ----------------------------------------------------------------------

export default function useOffsetTop(top?: number) {
  const isTop = top || 100

  useEffect(() => {
    const onScroll = () => {
      state.lastScrollingDirection = state.scrollingDirection
      state.lastOffsetTop = state.offsetTop
      state.offsetTop = window.scrollY
      if (!state.lockScrollDirection) {
        if (state.offsetTop > state.lastOffsetTop) {
          state.scrollingDirection = 'down'
        } else if (state.offsetTop < state.lastOffsetTop) {
          state.scrollingDirection = 'up'
        } else {
          state.scrollingDirection = 'none'
        }
      }

      if (state.dialogOpen === false) {
        if (state.offsetTop > isTop) {
          state.isScrolling = true
        } else {
          state.isScrolling = false
        }
      }
    }
    window.removeEventListener('scroll', onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [isTop])
}
