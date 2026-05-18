'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import { Icon } from '@/components/icon'
import { SideSection } from '@/components/side-section'
import bars2Icon from '@iconify/icons-heroicons/bars-2-20-solid'
import xMarkIcon from '@iconify/icons-heroicons/x-mark-20-solid'

export function FloatingSideButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open sidebar"
        className="hidden md:flex lg:hidden fixed bottom-6 right-6 z-40 items-center justify-center w-12 h-12 rounded-full bg-accent text-accent-contrast shadow-lg hover:bg-accent-dark transition-colors cursor-pointer"
      >
        <Icon icon={bars2Icon} className="w-6 h-6" />
      </button>

      <Dialog
        as="div"
        className="relative z-50 lg:hidden"
        onClose={() => setIsOpen(false)}
        open={isOpen}
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-body/50 backdrop-blur-md duration-500 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 font-body h-screen min-h-screen text-contrast w-[650px] max-w-full right-0 left-auto">
          <div className="flex justify-end h-full">
            <DialogPanel
              transition
              className="pointer-events-auto h-full bg-body2 shadow-xl w-full overflow-hidden overflow-y-auto scrollbar-hide duration-500 ease-in-out transition data-[closed]:translate-x-full [-webkit-overflow-scrolling:touch]"
            >
              <div className="flex flex-col pt-6 pb-14 px-7">
                <div className="w-full flex justify-between items-center mb-6">
                  <DialogTitle className="text-lg font-heading font-bold">
                    More
                  </DialogTitle>
                  <button
                    type="button"
                    className="rounded-full p-1.5 cursor-pointer -mr-2 text-contrast hover:text-accent"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close sidebar"
                  >
                    <Icon icon={xMarkIcon} className="h-6 w-6" />
                  </button>
                </div>
                <SideSection noPadding onCategorySelect={() => setIsOpen(false)} />
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  )
}
