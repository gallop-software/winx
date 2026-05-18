'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/button'
import { useSidebarStack } from './context'

export interface OpenSidebarButtonProps {
  children: ReactNode
  componentId: string
  title: string
  className?: string
  icon?: { body: string; width?: number; height?: number }
  iconPlacement?: 'before' | 'after'
  /** Show title immediately instead of fading in on scroll */
  showTitleImmediately?: boolean
}

/**
 * A button that opens a sidebar panel when clicked.
 * Client component that uses the sidebar stack context.
 */
export function OpenSidebarButton({
  children,
  componentId,
  title,
  className,
  icon,
  iconPlacement,
  showTitleImmediately,
}: OpenSidebarButtonProps) {
  const { push } = useSidebarStack()

  const handleClick = () => {
    push({
      title,
      componentId,
      ...(showTitleImmediately && { showTitleImmediately }),
    })
  }

  return (
    <Button
      onClick={handleClick}
      className={className}
      icon={icon}
      iconPlacement={iconPlacement}
    >
      {children}
    </Button>
  )
}
