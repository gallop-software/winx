// Auto-generated — regenerate with: npm run blocks
// Maps demo page slugs to block imports

import type { ComponentType } from 'react'

export const blockImports: Record<string, () => Promise<{ default: ComponentType }>> = {
  'about/body': () => import('@/app/(default)/about/_blocks/body'),
  'about/hero': () => import('@/app/(default)/about/_blocks/hero'),
  'archive': () => import('@/app/(default)/_blocks/archive'),
  'contact/contact-form': () => import('@/app/(default)/contact/_blocks/contact-form'),
  'contact/hero': () => import('@/app/(default)/contact/_blocks/hero'),
  'contact/testimonial': () => import('@/app/(default)/contact/_blocks/testimonial'),
  'essays/archive': () => import('@/app/(default)/essays/_blocks/archive'),
  'essays/hero': () => import('@/app/(default)/essays/_blocks/hero'),
  'logo-card': () => import('@/app/(default)/_blocks/logo-card'),
}

export const blockSlugs = Object.keys(blockImports)
