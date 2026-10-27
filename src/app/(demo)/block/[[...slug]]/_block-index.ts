// Auto-generated — regenerate with: npm run blocks
// Maps demo page slugs to block imports

import type { ComponentType } from 'react'

export const blockImports: Record<string, () => Promise<{ default: ComponentType }>> = {
  'about/body': () => import('@/app/(default)/about/_blocks/body'),
  'about/hero': () => import('@/app/(default)/about/_blocks/hero'),
  'account/confirm/confirm': () => import('@/app/(default)/account/confirm/_blocks/confirm'),
  'account/profile': () => import('@/app/(default)/account/_blocks/profile'),
  'account/reset/reset': () => import('@/app/(default)/account/reset/_blocks/reset'),
  'account/unsubscribe/unsubscribe': () => import('@/app/(default)/account/unsubscribe/_blocks/unsubscribe'),
  'archive': () => import('@/app/(default)/_blocks/archive'),
  'contact/contact-form': () => import('@/app/(default)/contact/_blocks/contact-form'),
  'contact/hero': () => import('@/app/(default)/contact/_blocks/hero'),
  'contact/testimonial': () => import('@/app/(default)/contact/_blocks/testimonial'),
  'essays/archive': () => import('@/app/(default)/essays/_blocks/archive'),
  'essays/hero': () => import('@/app/(default)/essays/_blocks/hero'),
  'essays/pages': () => import('@/app/(default)/essays/_blocks/pages'),
  'logo-card': () => import('@/app/(default)/_blocks/logo-card'),
  'newsletter/confirm/confirm': () => import('@/app/(default)/newsletter/confirm/_blocks/confirm'),
}

export const blockSlugs = Object.keys(blockImports)
