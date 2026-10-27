'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import xMarkIcon from '@iconify/icons-heroicons/x-mark'
import { Heading } from '@/components/heading'
import { Icon } from '@/components/icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

// A small dialog in the middle of the page, as the login and the admin
// dialogs are.
export function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-overlay/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="relative mx-auto w-full max-w-sm rounded-lg bg-body p-7 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 p-1 text-contrast/60 hover:text-contrast cursor-pointer"
          >
            <Icon icon={xMarkIcon} className="w-5 h-5" />
          </button>
          <DialogTitle as="div">
            <Heading as="h3" margin="mb-4" disableId>
              {title}
            </Heading>
          </DialogTitle>
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
