'use client'

import { Disclosure } from '@headlessui/react'
import Link from 'next/link'
import type { ReactElement } from 'react'
import clsx from 'clsx'
import { Logo } from '@/components/logo'
import { DesktopNav } from './desktop-nav'
import { SearchButton } from './search-button'
import { SocialMediaNav } from './social-media-nav'
import { MobileNavButton } from './mobile-nav-button'
import { StickyNavbar } from './sticky-navbar'
import useOffsetTop from '@/hooks/use-offset-top'
import { state, useSnapshot } from '@/state'
import type { NavbarProps } from './types'
import { homeLink } from './config'

/**
 * Main navigation bar component for the application
 *
 * Features:
 * - Responsive design with desktop and mobile layouts
 * - Click-based dropdown menus for desktop
 * - Mobile hamburger menu with animations
 * - Social media links integration
 * - TypeScript typed with comprehensive interfaces
 * - Accessible design with proper ARIA labels
 * - Tailwind CSS styling with custom theme colors
 *
 * @returns {ReactElement} The rendered navigation component
 */
export function Navbar2({
  className = '',
  dark = false,
  hero = false,
}: NavbarProps = {}): ReactElement {
  useOffsetTop(800)
  const snap = useSnapshot(state)
  const isScrolling = snap.isScrolling
  const scrollingDirection = snap.scrollingDirection

  return (
    <>
      <Disclosure
        as="header"
        id="navbar"
        className={clsx(
          'pt-12 sm:pt-16 z-40 pb-10',
          hero ? 'absolute top-0 left-0 right-0 mx-4' : 'relative',
          className
        )}
      >
        {() => (
          <>
            <div className="mx-auto max-w-[1800px] px-6 lg:px-8">
              <div className="relative flex items-center">
                {/* Logo Section */}
                <div className="shrink-0">
                  <Link
                    prefetch={true}
                    scroll={true}
                    href={homeLink}
                    title="Speedwell"
                    className="block lg:hover:bg-contrast-dark/2.5 lg:rounded-lg lg:p-2  outline-none focus:outline-none"
                  >
                    <Logo
                      className="w-[120px] md:w-[200px]"
                      width={200}
                      dark={dark}
                    />
                  </Link>
                </div>

                {/* Centered Navigation - only at xl and above */}
                <div className="hidden xl:block absolute left-1/2 transform -translate-x-1/2">
                  <DesktopNav
                    isScrolling={isScrolling}
                    dark={dark}
                  />
                </div>

                {/* Right Side - Nav (at lg only), Social Media Icons and Mobile Button */}
                <div className="flex items-center ml-auto gap-2">
                  <div className="hidden lg:block xl:hidden">
                    <DesktopNav
                      isScrolling={isScrolling}
                      dark={dark}
                    />
                  </div>
                  <SearchButton
                    enableShortcut={true}
                    dark={dark}
                  />
                  <SocialMediaNav dark={dark} />
                  <MobileNavButton dark={dark} />
                </div>
              </div>
            </div>
          </>
        )}
      </Disclosure>
      <StickyNavbar
        isScrolling={isScrolling}
        scrollingDirection={scrollingDirection}
      />
    </>
  )
}
