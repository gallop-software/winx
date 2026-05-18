import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import { useState, type ReactElement } from 'react'
import clsx from 'clsx'
import bars2Icon from '@iconify/icons-heroicons/bars-2-20-solid'
import xMarkIcon from '@iconify/icons-heroicons/x-mark-20-solid'
import { Icon } from '@/components/icon'
import { MobileNav } from './mobile-nav'

interface MobileNavButtonProps {
  dark?: boolean
}

/**
 * Sticky Mobile Nav Button with Sidebar Dialog
 * Opens mobile navigation in a sliding sidebar dialog
 */
export function MobileNavButton({
  dark = false,
}: MobileNavButtonProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)

  const closeModal = () => {
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={clsx(
          'lg:hidden rounded-lg transition-colors duration-200 p-2 cursor-pointer -mr-2 focus:outline-none focus:ring-0',
          dark
            ? 'text-body hover:text-body/80'
            : 'text-accent hover:text-accent-dark'
        )}
        aria-label="Open mobile menu"
      >
        <Icon
          icon={bars2Icon}
          className="h-7 w-7"
        />
      </button>

      <Dialog
        as="div"
        className="relative z-50 lg:hidden"
        onClose={closeModal}
        open={isOpen}
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-body/50 backdrop-blur-md duration-500 ease-out data-[closed]:opacity-0"
        />

        <div className="fixed inset-0 font-body h-screen min-h-screen text-contrast max-w-[86%] md:max-w-[77%] w-full right-0 left-auto scroll-smooth">
          <div className="flex justify-end h-full">
            <DialogPanel
              transition
              className="pointer-events-auto h-full bg-body2 shadow-xl text-left align-middle overflow-hidden overflow-y-auto scrollbar-hide w-full duration-500 ease-in-out transition data-[closed]:translate-x-full [-webkit-overflow-scrolling:touch]"
            >
              <div className="relative flex items-center justify-start flex-col h-full pt-6 pb-14">
                {/* Header */}
                <div className="w-full flex justify-between px-8 mb-6">
                  <DialogTitle className="text-lg font-heading font-bold">
                    Menu
                  </DialogTitle>
                  <button
                    type="button"
                    className="rounded-full focus:outline-none focus:ring-0 p-1.5 cursor-pointer -mr-2"
                    onClick={closeModal}
                  >
                    <Icon
                      icon={xMarkIcon}
                      className="h-6 w-6"
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {/* Mobile Navigation Content */}
                <div
                  className={clsx(
                    'h-full px-8 [&>*:first-child]:mt-0 w-full',
                    "after:content-[''] after:block after:w-full after:h-20 after:xl:h-10"
                  )}
                >
                  <MobileNav close={closeModal} />
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  )
}
