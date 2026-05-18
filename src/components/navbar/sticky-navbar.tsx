import { Disclosure } from '@headlessui/react'
import { motion } from 'framer-motion'
import type { ReactElement } from 'react'
import clsx from 'clsx'
import { SearchButton } from './search-button'
import { SocialMediaNav } from './social-media-nav'
import { MobileNavButton } from './mobile-nav-button'
import { Image } from '@/components/image'

/**
 * Sticky navbar component
 * Appears on scroll with slide-in/out animation
 * Always uses normal theme
 * @returns {ReactElement} Sticky navbar element
 */
export function StickyNavbar({
  isScrolling,
  scrollingDirection,
}: {
  isScrolling?: boolean | undefined
  scrollingDirection?: string
} = {}): ReactElement {
  const shouldShow = isScrolling && scrollingDirection === 'up'

  return (
    <motion.div
      initial={{ y: '-100%' }}
      animate={{ y: shouldShow ? 0 : '-100%' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="z-40 fixed top-0 left-0 right-0"
    >
      <Disclosure
        as="header"
        className={clsx(
          'bg-body shadow-xl py-4 lg:py-4 border-b border-accent/20'
        )}
      >
        {({ open, close }) => {
          // Close mobile menu when navbar slides up
          if (!isScrolling && open) {
            close()
          }

          return (
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
                      className="w-16 h-16 object-cover"
                    />
                  </div>

                  {/* Right Side - Search, Social Media Icons, Mobile Button */}
                  <div className="flex items-center ml-auto gap-2">
                    <SearchButton enableShortcut={false} />
                    <SocialMediaNav />
                    <MobileNavButton />
                  </div>
                </div>
              </div>
            </>
          )
        }}
      </Disclosure>
    </motion.div>
  )
}
