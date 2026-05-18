import heartIcon from '@iconify/icons-heroicons/heart-solid'
import { Icon } from '@/components/icon'
import facebookIcon from '@iconify/icons-mdi/facebook'
import instagramIcon from '@iconify/icons-mdi/instagram'
import phoneIcon from '@iconify/icons-mdi/phone'
import emailOutlineIcon from '@iconify/icons-mdi/email-outline'

export interface FooterLink {
  href: string
  label: string
}

export interface SocialLink {
  name: string
  href: string
  icon: { body: string; width?: number; height?: number }
}

/**
 * Social media links configuration
 */
export const socialLinks: SocialLink[] = [
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/speedwell',
    icon: facebookIcon,
  },
  {
    name: 'Instagram',
    href: 'http://instagram.com/speedwell',
    icon: instagramIcon,
  },
  {
    name: 'Phone',
    href: 'tel:5551234567',
    icon: phoneIcon,
  },
  {
    name: 'Email',
    href: 'mailto:me@your-company.com',
    icon: emailOutlineIcon,
  },
]

/**
 * Left column navigation links
 */
export const leftColumn: FooterLink[] = [
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Residential Design', href: '/residential' },
  { label: 'Commercial Design', href: '/commercial' },
  { label: 'Kitchen & Bath', href: '/kitchen-bath' },
  { label: 'Space Planning', href: '/space-planning' },
  { label: 'Color Consultation', href: '/color-consultation' },
  { label: 'Furniture Selection', href: '/furniture' },
]

/**
 * Right column navigation links
 */
export const rightColumn: FooterLink[] = [
  { label: 'Our Story', href: '/residential' },
  { label: 'Meet the Team', href: '/commercial' },
  { label: 'Client Testimonials', href: '/testimonials' },
  { label: 'Before & After', href: '/before-after' },
  { label: 'Project Management', href: '/project-management' },
  { label: 'Contact', href: '/contact' },
  { label: 'Join Our Team', href: '/join-our-team' },
]

/**
 * Footer description text
 */
export const description =
  'Situated in the heart of the Design District on Main Street, our studio is steps away from premier showrooms and artisan workshops. Nestled within a beautifully restored historic building, our inspiring space is perfect for bringing your design vision to life.'

/**
 * Copyright business name
 */
export const copyrightName = 'Timmerman Interior Designer'

/**
 * Webmaster credit
 */
export function WebMaster() {
  return (
    <>
      Built with{' '}
      <Icon
        icon={heartIcon}
        className="text-red-500"
      />{' '}
      by the team at{' '}
      <a
        className="underline hover:text-contrast-light"
        href="https://gallop.software/"
      >
        Gallop
      </a>
    </>
  )
}
