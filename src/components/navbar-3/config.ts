import homeIcon from '@iconify/icons-mdi/home-outline'
import officeIcon from '@iconify/icons-mdi/office-building-outline'
import bathtubIcon from '@iconify/icons-mdi/bathtub-outline'
import floorPlanIcon from '@iconify/icons-mdi/floor-plan'
import paletteIcon from '@iconify/icons-mdi/palette-outline'
import sofaIcon from '@iconify/icons-mdi/sofa-outline'
import clipboardCheckIcon from '@iconify/icons-mdi/clipboard-check-outline'
import bookOpenIcon from '@iconify/icons-mdi/book-open-page-variant-outline'
import accountGroupIcon from '@iconify/icons-mdi/account-group-outline'
import starIcon from '@iconify/icons-mdi/star-outline'
import compareIcon from '@iconify/icons-mdi/compare-horizontal'
import emailIcon from '@iconify/icons-mdi/email-outline'
import handshakeIcon from '@iconify/icons-mdi/handshake-outline'
import facebookIcon from '@iconify/icons-mdi/facebook'
import instagramIcon from '@iconify/icons-mdi/instagram'
import phoneIcon from '@iconify/icons-mdi/phone'
import emailOutlineIcon from '@iconify/icons-mdi/email-outline'
import viewDashboardIcon from '@iconify/icons-mdi/view-dashboard-outline'
import viewColumnIcon from '@iconify/icons-mdi/view-column-outline'
import viewCarouselIcon from '@iconify/icons-mdi/view-carousel-outline'
import dockLeftIcon from '@iconify/icons-mdi/dock-left'
import dockTopIcon from '@iconify/icons-mdi/dock-top'
import windowMaximizeIcon from '@iconify/icons-mdi/window-maximize'
import viewSplitVerticalIcon from '@iconify/icons-mdi/view-split-vertical'
import type { NavLink, SocialLink } from './types'

/**
 * Home link for logo navigation
 */
export const homeLink = '/'

/**
 * Main navigation links configuration
 * Includes both simple links and dropdown menus
 */
export const links: NavLink[] = [
  { href: '/portfolio', label: 'Portfolio' },
  {
    href: '/services',
    label: 'Services',
    dropdown: {
      position: 'right',
      columns: 2,
      items: [
        {
          name: 'Residential Design',
          description: 'Transform your home into a personal sanctuary',
          href: '/residential',
          icon: homeIcon,
        },
        {
          name: 'Commercial Design',
          description: 'Create inspiring workspaces that drive success',
          href: '/commercial',
          icon: officeIcon,
        },
        {
          name: 'Kitchen & Bath',
          description: 'Luxury and functionality for your daily rituals',
          href: '/kitchen-bath',
          icon: bathtubIcon,
        },
        {
          name: 'Space Planning',
          description: 'Optimize your layout for comfort and flow',
          href: '/space-planning',
          icon: floorPlanIcon,
        },
        {
          name: 'Color Consultation',
          description: 'Expert guidance for the perfect palette',
          href: '/color-consultation',
          icon: paletteIcon,
        },
        {
          name: 'Furniture Selection',
          description: 'Curated pieces that reflect your style',
          href: '/furniture',
          icon: sofaIcon,
        },
        {
          name: 'Project Management',
          description: 'Seamless execution from concept to completion',
          href: '/project-management',
          icon: clipboardCheckIcon,
        },
      ],
    },
  },
  {
    href: '/contact',
    label: 'About',
    dropdown: {
      columns: 1,
      position: 'right',
      items: [
        {
          name: 'Our Story',
          description: 'Learn about our design philosophy and passion',
          href: '/residential',
          icon: bookOpenIcon,
        },
        {
          name: 'Meet the Team',
          description: 'Get to know our talented designers',
          href: '/meet-the-team',
          icon: accountGroupIcon,
        },
        {
          name: 'Client Testimonials',
          description: 'Stories from our satisfied clients',
          href: '/testimonials',
          icon: starIcon,
        },
        {
          name: 'Before & After',
          description: 'See the transformation process',
          href: '/before-after',
          icon: compareIcon,
        },
        {
          name: 'Contact',
          description: 'Get in touch with our design team',
          href: '/contact',
          icon: emailIcon,
        },
        {
          name: 'Join our Team',
          description: 'Explore career opportunities with us',
          href: '/join-our-team',
          icon: handshakeIcon,
        },
      ],
    },
  },
  {
    href: '/demos',
    label: 'Demos',
    callToAction: true,
    dropdown: {
      position: 'right',
      columns: 2,
      items: [
        {
          name: 'Homepage Demo',
          description: 'Front page with hero and features',
          href: '/',
          icon: homeIcon,
        },
        {
          name: 'One Page Site',
          description: 'Navbar with smooth scrolling to sections',
          href: '/layout-1',
          icon: viewDashboardIcon,
        },
        {
          name: 'Alternate Navbar/Footer',
          description: 'Right aligned navigation with 4 columns footer',
          href: '/layout-2',
          icon: dockTopIcon,
        },
        {
          name: 'Photographer Portfolio',
          description: 'Multi-column content distribution design',
          href: '/layout-3',
          icon: viewColumnIcon,
        },
        {
          name: 'Layout 4',
          description: 'Full-width carousel presentation style',
          href: '/layout-4',
          icon: viewCarouselIcon,
        },
        {
          name: 'Layout 5',
          description: 'Split-screen with fixed left panel',
          href: '/layout-5',
          icon: dockLeftIcon,
        },
        {
          name: 'Layout 6',
          description: 'Fullscreen hero with minimal chrome',
          href: '/layout-6',
          icon: windowMaximizeIcon,
        },
        {
          name: 'Layout 7',
          description: 'Vertical split content arrangement',
          href: '/layout-7',
          icon: viewSplitVerticalIcon,
        },
      ],
    },
  },
]

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
