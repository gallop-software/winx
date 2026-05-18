'use client'

import React, { useState } from 'react'
import { clsx } from 'clsx'
import { Icon } from '@/components/icon'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import clipboardIcon from '@iconify/icons-lucide/clipboard'

interface CardContactProps {
  children?: React.ReactNode
  className?: string
  /** Link URL */
  href: string
  /** Background color override */
  color?: string
  /** Heading text */
  heading: string
  /** Description text */
  text: string
  /** Icon object */
  icon: { body: string; width?: number; height?: number }
  /** Icon color override */
  iconColor?: string
  /** Value to copy to clipboard when copy button is clicked */
  copy?: string
}

export function CardContact({
  children,
  className = '',
  href,
  color = '',
  heading,
  text,
  icon,
  iconColor = '',
  copy,
}: CardContactProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  // Use user-defined values if provided, otherwise use defaults
  const finalColor = color || 'bg-body hover:bg-body/90 text-contrast'
  const finalIconColor =
    iconColor ||
    'text-accent bg-accent3 group-hover:bg-accent3-dark group-hover:text-accent-dark'

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (copy) {
      navigator.clipboard.writeText(copy)
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 1500)
    }
  }

  return (
    <a
      href={href}
      className={clsx(
        'group rounded-lg flex items-center gap-6 justify-center w-full p-5',
        finalColor,
        // Custom className can override or extend default styles
        className
      )}
    >
      <div className="w-full flex flex-col items-start justify-center">
        <Heading
          as="h4"
          margin="mb-2"
        >
          {heading}
        </Heading>
        <Paragraph
          margin="0"
          fontSize="text-xs"
        >
          {text}
        </Paragraph>
        {children}
      </div>
      <div className="flex items-center gap-3">
        {copy && (
          <button
            onClick={handleCopy}
            className="relative flex size-11 flex-none items-center justify-center rounded-full bg-body-light text-contrast-light hover:bg-body-dark transition-colors cursor-grab"
            aria-label="Copy to clipboard"
          >
            <Icon
              icon={clipboardIcon}
              aria-hidden={true}
              className="size-5"
            />
            {showTooltip && (
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-contrast-dark text-body text-xs px-2 py-1 rounded whitespace-nowrap">
                Copied!
              </span>
            )}
          </button>
        )}
        <span
          className={clsx(
            finalIconColor,
            'flex size-11 flex-none items-center justify-center rounded-full'
          )}
        >
          <Icon
            icon={icon}
            aria-hidden={true}
            className={clsx('size-5')}
          />
        </span>
      </div>
    </a>
  )
}
