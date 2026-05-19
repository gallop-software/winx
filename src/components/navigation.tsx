'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { state, useSnapshot } from '@/state'
import { goBack } from '@/components/back-button'
import { Button } from '@/components/button'
import chevronLeftIcon from '@iconify/icons-heroicons/chevron-left'
import clsx from 'clsx'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'
import { Icon } from '@/components/icon'
import { Image } from '@/components/image'
import { Search } from '@/components/search'
import { SideSection } from '@/components/side-section'
import { getAllCategories } from '@/utils/taxonomies'
import chevronDownIcon from '@iconify/icons-heroicons/chevron-down'
import { resetBlogScroll } from '@/components/blog/blog-client'
import magnifyingGlassIcon from '@iconify/icons-heroicons/magnifying-glass'
import homeIcon from '@iconify/icons-heroicons/home'
import informationCircleIcon from '@iconify/icons-heroicons/user-circle'
import newspaperIcon from '@iconify/icons-heroicons/bookmark'
import envelopeIcon from '@iconify/icons-heroicons/envelope'
import bars2Icon from '@iconify/icons-heroicons/bars-2-20-solid'
import xMarkIcon from '@iconify/icons-heroicons/x-mark-20-solid'
import type { IconifyIcon } from '@iconify/types'

export function Navigation() {
  const [isSearching, setIsSearching] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const { pageBackButtonOutOfView } = useSnapshot(state)

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    resetBlogScroll()
    if (pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    if (isSearching) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setIsSearching(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSearching])
  const menuItems: { label: string; href: string; icon: IconifyIcon }[] = [
    { label: 'Home', href: '/', icon: homeIcon },
    { label: 'Essays', href: '/essays', icon: newspaperIcon },
    {
      label: 'About',
      href: '/about',
      icon: informationCircleIcon,
    },
    { label: 'Contact', href: '/contact', icon: envelopeIcon },
  ]
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)
  const buttonClass =
    'flex items-center justify-center xl:justify-start gap-4 rounded-md p-2 w-fit xl:w-full text-contrast hover:bg-accent/10 hover:text-accent transition-colors text-xs font-medium cursor-pointer'
  const activeClass = 'bg-accent/10 text-accent'

  const navBackButton = (
    <Button
      className="w-12! h-12! p-0!"
      onClick={goBack}
      aria-label="Go back"
      icon={chevronLeftIcon}
      iconSize="w-7 h-7"
      size="small"
    />
  )

  const brand = (
    <Link
      href="/"
      onClick={handleHomeClick}
      className="inline-flex items-center gap-3 md:mb-8"
      aria-label="Founder Notes"
    >
      <div className="w-12 h-12 shrink-0 overflow-hidden">
        <Image
          src="/favicon.png"
          alt="Founder Notes"
          size="small"
          rounded="rounded-none"
          className="w-full h-full object-cover"
        />
      </div>
      <span className="hidden xl:inline text-xs font-heading font-semibold uppercase tracking-[0.18em] text-accent leading-tight">
        Founder
        <br />
        Notes
      </span>
    </Link>
  )

  return (
    <>
      {/* Mobile bar (<md) */}
      <aside className="md:hidden flex flex-row items-center bg-body rounded-md px-7 py-5 border-b border-contrast-light/15">
        {brand}
        {pageBackButtonOutOfView && <div className="ml-3">{navBackButton}</div>}
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="ml-auto p-2 -mr-2 text-contrast hover:text-accent transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <Icon
            icon={bars2Icon}
            className="w-7 h-7"
          />
        </button>
      </aside>

      {/* Desktop sidebar (md+) */}
      <aside className="hidden md:flex flex-col items-center xl:items-start bg-body rounded-md pr-7 pl-7 xl:pl-9 pt-7 pb-5 border-b border-contrast-light/15 h-full overflow-y-auto scrollbar-hide">
        <div
          className={clsx(
            'grid overflow-hidden origin-top transition-all duration-[350ms] ease-out xl:w-full',
            pageBackButtonOutOfView
              ? 'grid-rows-[1fr] opacity-100 mb-8 scale-y-100'
              : 'grid-rows-[0fr] opacity-0 mb-0 scale-y-95'
          )}
        >
          <div className="flex justify-start min-h-0">{navBackButton}</div>
        </div>
        {brand}
        <nav className="flex flex-col gap-4 xl:w-full">
          {menuItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  if (item.href === '/') handleHomeClick(e)
                }}
                className={clsx(buttonClass, active && activeClass)}
              >
                <Icon
                  icon={item.icon}
                  className={clsx(
                    'w-7 h-7 shrink-0',
                    active ? 'text-accent' : 'text-contrast'
                  )}
                />
                <span className="leading-none hidden xl:inline">
                  {item.label}
                </span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setIsSearching(true)}
            className={buttonClass}
          >
            <Icon
              icon={magnifyingGlassIcon}
              className="w-7 h-7 shrink-0 text-contrast"
            />
            <span className="leading-none hidden xl:inline">Search</span>
          </button>
        </nav>
      </aside>

      {/* Mobile drawer */}
      <Dialog
        as="div"
        className="relative z-50 md:hidden"
        onClose={() => setIsMenuOpen(false)}
        open={isMenuOpen}
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-body/50 backdrop-blur-md duration-500 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 font-body h-screen min-h-screen text-contrast max-w-[92%] sm:max-w-[78%] w-full right-0 left-auto">
          <div className="flex justify-end h-full">
            <DialogPanel
              transition
              className="pointer-events-auto h-full bg-body shadow-xl w-full overflow-hidden overflow-y-auto scrollbar-hide duration-500 ease-in-out transition data-[closed]:translate-x-full [-webkit-overflow-scrolling:touch]"
            >
              <div className="flex flex-col pt-6 pb-14 px-7">
                <div className="w-full flex justify-between items-center mb-6">
                  <DialogTitle className="text-lg font-heading font-bold">
                    Menu
                  </DialogTitle>
                  <button
                    type="button"
                    className="rounded-full p-1.5 cursor-pointer -mr-2 text-contrast hover:text-accent"
                    onClick={() => setIsMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <Icon
                      icon={xMarkIcon}
                      className="h-6 w-6"
                    />
                  </button>
                </div>

                <nav className="flex flex-col gap-2 mb-6">
                  {menuItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={(e) => {
                        setIsMenuOpen(false)
                        if (item.href === '/') handleHomeClick(e)
                      }}
                      className="flex items-center gap-4 rounded-md p-2 text-contrast hover:bg-accent/10 hover:text-accent transition-colors text-xs font-medium"
                    >
                      <Icon
                        icon={item.icon}
                        className="w-7 h-7 shrink-0 text-contrast"
                      />
                      <span className="leading-none">{item.label}</span>
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      setIsSearching(true)
                    }}
                    className="flex items-center gap-4 rounded-md p-2 text-contrast hover:bg-accent/10 hover:text-accent transition-colors text-xs font-medium cursor-pointer"
                  >
                    <Icon
                      icon={magnifyingGlassIcon}
                      className="w-7 h-7 shrink-0 text-contrast"
                    />
                    <span className="leading-none">Search</span>
                  </button>
                  <Disclosure>
                    {({ open }) => (
                      <>
                        <DisclosureButton className="flex w-full items-center gap-4 rounded-md p-2 text-contrast hover:bg-accent/10 hover:text-accent transition-colors text-xs font-medium cursor-pointer">
                          <Icon
                            icon={chevronDownIcon}
                            className={clsx(
                              'w-7 h-7 shrink-0 text-contrast transition-transform duration-200',
                              open && 'rotate-180'
                            )}
                          />
                          <span className="leading-none">Categories</span>
                        </DisclosureButton>
                        <DisclosurePanel className="flex flex-col gap-1 pl-11 pr-2 mt-1 mb-1">
                          {getAllCategories()
                            .filter((c) => (c.count ?? 0) > 0)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((c) => (
                              <Link
                                key={c.slug}
                                href={`/category/${c.slug}`}
                                onClick={() => setIsMenuOpen(false)}
                                className="rounded-md py-2 pl-6 pr-2 text-contrast hover:bg-accent/10 hover:text-accent transition-colors text-xs font-medium"
                              >
                                {c.name}
                              </Link>
                            ))}
                        </DisclosurePanel>
                      </>
                    )}
                  </Disclosure>
                </nav>

                <SideSection
                  noPadding
                  hideSearch
                  hideCategories
                />
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      <Search
        isOpen={isSearching}
        setIsOpen={setIsSearching}
      />
    </>
  )
}
