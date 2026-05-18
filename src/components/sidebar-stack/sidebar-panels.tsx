'use client'

import type { ReactNode } from 'react'
import { SidebarStackRenderer } from './renderer'
import { useSidebarStack } from './context'
import { Paragraph } from '@/components/paragraph'

export interface SidebarPanelsProps {
  panels: Record<string, ReactNode>
}

/**
 * Client component that renders sidebar panels based on a registry.
 * Takes pre-rendered ReactNode elements as panels, avoiding the need
 * to pass functions across the server/client boundary.
 * Also handles clicks on SidebarLink elements within the panels.
 */
export function SidebarPanels({ panels }: SidebarPanelsProps) {
  const { push } = useSidebarStack()

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const link = target.closest('a[data-sidebar-component]')

    if (link) {
      e.preventDefault()
      e.stopPropagation()
      const componentId = link.getAttribute('data-sidebar-component')
      const title = link.getAttribute('data-sidebar-title') || ''
      const showTitleImmediately =
        link.getAttribute('data-sidebar-show-title') === 'true'

      if (componentId) {
        push({ title, componentId, showTitleImmediately })
      }
    }
  }

  const renderContent = (componentId: string) => {
    const content = panels[componentId]
    return content ? (
      <div onClick={handleClick}>{content}</div>
    ) : (
      <Paragraph>Content not found</Paragraph>
    )
  }

  return <SidebarStackRenderer renderContent={renderContent} />
}
