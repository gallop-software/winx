import type { ReactNode } from 'react'

export interface SidebarLinkProps {
  children: ReactNode
  componentId: string
  title: string
  className?: string
  /** Show title immediately instead of fading in on scroll */
  showTitleImmediately?: boolean
}

/**
 * A declarative link component for sidebar navigation.
 * Does not use hooks - works with SidebarClickHandler via event delegation.
 */
export function SidebarLink({
  children,
  componentId,
  title,
  className = '',
  showTitleImmediately,
}: SidebarLinkProps) {
  // Note: onClick is handled by SidebarClickHandler via event delegation
  // The href uses a dash separator to avoid CSS selector issues with colons
  return (
    <a
      href={`#sidebar-panel-${componentId}`}
      data-sidebar-title={title}
      data-sidebar-component={componentId}
      data-sidebar-show-title={showTitleImmediately ? 'true' : undefined}
      className={className}
    >
      {children}
    </a>
  )
}
