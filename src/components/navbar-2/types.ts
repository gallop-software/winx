/**
 * TypeScript type definitions for the navbar component system
 */

/**
 * Dropdown menu item structure
 */
export interface DropdownItem {
  name: string
  description: string
  href: string
  icon: { body: string; width?: number; height?: number }
}

/**
 * Navigation link structure with optional dropdown
 */
export interface NavLink {
  href: string
  label: string
  dropdown?: {
    items: DropdownItem[]
    columns?: 1 | 2 | 3
    position?: 'left' | 'center' | 'right'
  }
}

/**
 * Call to action structure (currently unused but available)
 */
export interface CallToAction {
  name: string
  href: string
  icon: string
}

/**
 * Social media link structure
 */
export interface SocialLink {
  name: string
  href: string
  icon: { body: string; width?: number; height?: number }
}

/**
 * Main navbar component props
 */
export interface NavbarProps {
  className?: string
  dark?: boolean
  hero?: boolean
}

/**
 * Popover render props from Headless UI
 */
export interface PopoverRenderProps {
  open: boolean
}
