'use client'

import { Button } from '@/components/button'
import { state } from '@/state'
import { clsx } from 'clsx'

interface ButtonPlayProps {
  href?: string
  icon?: { body: string; width?: number; height?: number }
  iconPlacement?: 'before' | 'after'
  variant?: 'primary' | 'secondary'
  className?: string
  children: React.ReactNode
}

export function ButtonPlay({
  href,
  icon,
  iconPlacement,
  variant = 'secondary',
  className,
  children,
}: ButtonPlayProps) {
  const handlePlayVideo = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent default anchor jump behavior

    state.playVideo = true

    // Scroll to the href target using the same logic as smooth-scroll hook
    if (href) {
      const targetElement = document.querySelector(href)
      if (targetElement) {
        const offset = 40 // Same offset as smooth-scroll hook
        window.scrollTo({
          top:
            targetElement.getBoundingClientRect().top + window.scrollY - offset,
          behavior: 'smooth',
        })

        // Update URL hash like the smooth-scroll hook does
        history.pushState(null, '', href)
      }
    }
  }

  return (
    <Button
      variant={variant}
      {...(href && { href })}
      {...(icon && { icon })}
      {...(iconPlacement && { iconPlacement })}
      onClick={handlePlayVideo}
      className={clsx('no-anchor-scroll', className)}
    >
      {children}
    </Button>
  )
}
