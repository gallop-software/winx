'use client'

import React from 'react'
import { clsx } from 'clsx'
import { Heading } from '@/components/heading'
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react'
import chevronDownIcon from '@iconify/icons-heroicons/chevron-down'
import { Icon } from '@/components/icon'
import { motion } from 'framer-motion'

interface AccordionProps {
  headingText?: string
  children?: React.ReactNode
  className?: string
}

export function Accordion({
  headingText,
  children,
  className,
}: AccordionProps) {
  return (
    <div className={clsx('w-full', className)}>
      <Disclosure
        as="div"
        className="py-4"
        defaultOpen={false}
      >
        {({ open }) => (
          <>
            <DisclosureButton className="group flex w-full items-center justify-between text-left cursor-pointer bg-body2 hover:bg-body2/80 p-4">
              <Heading
                as="h3"
                margin="mb-0"
              >
                {headingText}
              </Heading>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <Icon
                  icon={chevronDownIcon}
                  className="size-6 text-contrast"
                />
              </motion.div>
            </DisclosureButton>

            <DisclosurePanel className="mt-8 text-xs leading-5 text-body/50 max-w-3xl">
              {children}
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    </div>
  )
}
