import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState, type ReactElement } from 'react'
import chevronDownIcon from '@iconify/icons-heroicons/chevron-down-20-solid'
import searchIcon from '@iconify/icons-lucide/search'
import { Icon } from '@/components/icon'
import { Search } from '@/components/search'
import { links, socialLinks } from './config'
import type { NavLink, DropdownItem, SocialLink } from './types'

/**
 * Mobile navigation menu component
 * Renders slide-down mobile menu with animations and expandable dropdowns
 * @param {function} close - Function to close the mobile menu
 * @returns {ReactElement} Mobile navigation menu
 */
export function MobileNav({ close }: { close: () => void }): ReactElement {
  const [isSearching, setIsSearching] = useState(false)

  return (
    <DisclosurePanel
      className="lg:hidden"
      static={false}
    >
      <div className="flex flex-col gap-3 py-8">
        {links.map(({ href, label, dropdown }: NavLink) => (
          <div key={href}>
            {dropdown ? (
              <Disclosure>
                {({ open }) => (
                  <motion.div
                    initial={{ opacity: 0, rotateX: -90 }}
                    animate={{ opacity: 1, rotateX: 0 }}
                    transition={{
                      duration: 0.1,
                      ease: 'easeInOut',
                    }}
                  >
                    <DisclosureButton className="flex w-full items-center justify-between text-base font-body font-medium text-contrast focus:outline-none py-2 cursor-pointer pr-2">
                      {label}
                      <Icon
                        icon={chevronDownIcon}
                        className={`h-6 w-6 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </DisclosureButton>
                    <DisclosurePanel className="mt-2">
                      <div className="flex flex-col gap-2">
                        {dropdown.items.map((item: DropdownItem) => (
                          <div
                            key={item.name}
                            className="group relative flex gap-x-4 py-3 cursor-pointer"
                          >
                            <div className="mt-1 flex size-10 flex-none items-center justify-center rounded-full bg-body-light">
                              <Icon
                                icon={item.icon}
                                aria-hidden={true}
                                className="size-5 text-accent"
                              />
                            </div>
                            <div className="flex-1">
                              <Link
                                prefetch={true}
                                scroll={true}
                                href={item.href}
                                onClick={close}
                                className="font-body font-medium text-contrast text-sm"
                              >
                                {item.name}
                                <span className="absolute inset-0" />
                              </Link>
                              <p className="mt-1 text-xs text-contrast-light">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </DisclosurePanel>
                  </motion.div>
                )}
              </Disclosure>
            ) : (
              <motion.div
                initial={{ opacity: 0, rotateX: -90 }}
                animate={{ opacity: 1, rotateX: 0 }}
                transition={{
                  duration: 0.1,
                  ease: 'easeInOut',
                }}
              >
                <Link
                  href={href}
                  onClick={close}
                  className="text-base block font-body font-medium text-contrast py-2 px-0"
                >
                  {label}
                </Link>
              </motion.div>
            )}
          </div>
        ))}
        {/* Mobile Search Button */}
        <button
          type="button"
          className="mt-4 w-full flex items-center justify-start rounded-lg py-2.5 pr-3.5 pl-4 text-base ring-1 ring-contrast outline-none focus:outline-none focus:ring-contrast hover:bg-contrast-dark/2.5"
          onClick={() => setIsSearching(true)}
        >
          <Icon
            icon={searchIcon}
            className="h-5 w-5 flex-none text-contrast hover:text-contrast"
          />
          <span className="ml-2 text-contrast">Search...</span>
        </button>
        {/* Mobile Search Modal */}
        <Search
          isOpen={isSearching}
          setIsOpen={setIsSearching}
        />{' '}
        {/* Mobile Social Media Links */}
        <div className="flex flex-col gap-3 pt-10 border-t-1 border-contrast mt-10">
          {socialLinks.map((item: SocialLink) => (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-x-3 py-2 text-base font-body font-medium text-contrast"
              aria-label={item.name}
            >
              <Icon
                icon={item.icon}
                className="size-6 text-accent"
              />
              <span>{item.name}</span>
            </a>
          ))}
        </div>
      </div>
    </DisclosurePanel>
  )
}
