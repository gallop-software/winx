import {
  Popover,
  PopoverButton,
  PopoverPanel,
  PopoverBackdrop,
  CloseButton,
} from '@headlessui/react'
import Link from 'next/link'
import type { ReactElement } from 'react'
import chevronDownIcon from '@iconify/icons-heroicons/chevron-down-20-solid'
import clsx from 'clsx'
import { Icon } from '@/components/icon'
import { links } from './config'
import type { NavLink, DropdownItem } from './types'

/**
 * Desktop navigation component
 * Renders horizontal navigation with dropdowns for larger screens
 * @returns {ReactElement} Desktop navigation elements
 */
export function DesktopNav({
  isScrolling,
  forceCloseOnHide,
  dark = false,
}: {
  isScrolling?: boolean | undefined
  forceCloseOnHide?: boolean | undefined
  dark?: boolean
} = {}): ReactElement {
  return (
    <nav className="relative hidden lg:flex">
      {links.map(({ href, label, dropdown }: NavLink) => (
        <div
          key={href}
          className="relative flex"
        >
          {dropdown ? (
            <Popover
              className="relative"
              key={forceCloseOnHide ? `${href}-${isScrolling}` : href}
            >
              {({ open }: any) => (
                <>
                  <PopoverBackdrop className="fixed inset-0 z-40" />
                  <PopoverButton
                    className={clsx(
                      'flex h-full cursor-pointer items-center px-4 py-3 text-base font-body font-medium bg-blend-multiply focus:outline-none rounded-lg',
                      dark
                        ? 'text-body hover:bg-body/10'
                        : 'text-contrast data-hover:bg-contrast-dark/[2.5%]'
                    )}
                  >
                    {label}
                    <Icon
                      icon={chevronDownIcon}
                      className={`ml-1 h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </PopoverButton>
                  <PopoverPanel
                    transition
                    className={`absolute z-50 mt-5 flex w-screen max-w-max px-4 transition data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in ${
                      (dropdown.position ?? 'left') === 'right'
                        ? 'right-0 xl:-mr-4'
                        : (dropdown.position ?? 'left') === 'center'
                          ? 'left-1/2 -translate-x-1/2'
                          : 'left-1/2 -translate-x-1/2 xl:left-0 xl:-ml-4 xl:translate-x-0'
                    }`}
                  >
                    <div
                      className={`w-screen ${
                        (dropdown.columns ?? 1) === 1
                          ? 'max-w-md'
                          : (dropdown.columns ?? 1) === 2
                            ? 'max-w-2xl'
                            : 'max-w-2xl xl:max-w-4xl'
                      } flex-auto overflow-hidden rounded-3xl bg-body2 text-xs/6 shadow-lg ring-1 ring-accent/20`}
                    >
                      <div
                        className={`p-4 ${
                          (dropdown.columns ?? 1) === 2
                            ? 'grid grid-cols-2 gap-x-4'
                            : (dropdown.columns ?? 1) === 3
                              ? 'grid grid-cols-2 xl:grid-cols-3 gap-x-4'
                              : ''
                        }`}
                      >
                        {dropdown.items.map((item: DropdownItem) => (
                          <CloseButton
                            as={Link}
                            key={item.name}
                            href={item.href}
                            prefetch={true}
                            scroll={true}
                            className="group relative flex gap-x-6 rounded-lg p-4 hover:bg-contrast-dark/[2.5%] cursor-pointer"
                          >
                            <span className="mt-1 flex size-11 flex-none items-center justify-center rounded-full bg-body-light group-hover:bg-body-light/50">
                              <Icon
                                icon={item.icon}
                                aria-hidden={true}
                                className="size-6 text-accent group-hover:text-accent-dark"
                              />
                            </span>
                            <span className="flex flex-col">
                              <span className="font-medium text-contrast">
                                {item.name}
                              </span>
                              <span className="mt-1 text-contrast-light">
                                {item.description}
                              </span>
                            </span>
                          </CloseButton>
                        ))}
                      </div>
                    </div>
                  </PopoverPanel>
                </>
              )}
            </Popover>
          ) : (
            <Link
              href={href}
              className={clsx(
                'flex items-center px-4 py-3 text-base font-body font-medium bg-blend-multiply rounded-lg',
                dark
                  ? 'text-body hover:bg-body/10'
                  : 'text-contrast hover:bg-contrast-dark/[2.5%]'
              )}
            >
              {label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
