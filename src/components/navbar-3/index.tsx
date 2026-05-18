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
 * Main navigation bar component for the application (Navbar3)
 */
export function Navbar3({
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
                      className="w-[120px] xl:w-[200px]"
                      width={200}
                      dark={dark}
                    />
                  </Link>
                </div>

                {/* Right Side - Nav, Social Media Icons and Mobile Button */}
                <div className="flex items-center ml-auto gap-2">
                  <SearchButton
                    enableShortcut={true}
                    dark={dark}
                  />
                  <DesktopNav
                    isScrolling={isScrolling}
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
