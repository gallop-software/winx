'use client'

import { Disclosure } from '@headlessui/react'
import type { ReactElement } from 'react'
import clsx from 'clsx'
import { SearchButton } from './search-button'
import { SocialMediaNav } from './social-media-nav'
import { MobileNavButton } from './mobile-nav-button'
import { StickyNavbar } from './sticky-navbar'
import { Image } from '@/components/image'
import useOffsetTop from '@/hooks/use-offset-top'
import { state, useSnapshot } from '@/state'
import type { NavbarProps } from './types'

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
export function Navbar({
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
          'bg-body pt-12 sm:pt-16 z-40 pb-10',
          hero ? 'absolute top-0 left-0 right-0 mx-4' : 'relative',
          className
        )}
      >
        {() => (
          <>
            <div className="mx-auto max-w-[1800px] px-6 lg:px-8">
              <div className="relative flex items-center">
                {/* Left - Photo */}
                <div className="shrink-0">
                  <Image
                    src="/dougpicture-198.jpg"
                    alt="Douglas Newby"
                    size="small"
                    rounded="rounded-full"
                    className="w-20 h-20 md:w-28 md:h-28 object-cover"
                  />
                </div>

                {/* Right Side - Search, Social Media Icons, Mobile Button */}
                <div className="flex items-center ml-auto gap-2">
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
