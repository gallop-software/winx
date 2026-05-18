'use client'

import Link from 'next/link'
import clsx from 'clsx'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Icon } from '@/components/icon'
import chevronDownIcon from '@iconify/icons-heroicons/chevron-down'
import type { IconifyIcon } from '@iconify/types'

export interface DropdownItem {
  label: string
  href?: string
  onClick?: () => void
  count?: number
}

interface DropdownProps {
  label: string
  items: DropdownItem[]
  className?: string
  buttonClassName?: string
  panelClassName?: string
  placement?: 'bottom' | 'top'
  showCount?: boolean
  searchable?: boolean
  emptyLabel?: string
  leadingIcon?: IconifyIcon
  leadingIconClassName?: string
  hideChevron?: boolean
  onSelect?: (item: DropdownItem) => void
}

export function Dropdown({
  label,
  items,
  className,
  buttonClassName,
  panelClassName,
  placement = 'bottom',
  showCount = false,
  searchable = false,
  emptyLabel = 'No options',
  leadingIcon,
  leadingIconClassName = 'w-4 h-4 shrink-0',
  hideChevron = false,
  onSelect,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return items
    const q = query.toLowerCase()
    return items.filter((i) => i.label.toLowerCase().includes(q))
  }, [items, query, searchable])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const triggerClass = clsx(
    'w-full flex items-center justify-between gap-2 bg-body text-contrast-light px-3 py-2 text-xs shadow-md rounded-md text-left outline-none',
    buttonClassName
  )

  return (
    <div
      ref={rootRef}
      className={clsx('relative block w-full', className)}
    >
      {searchable ? (
        <div className={clsx(triggerClass, 'cursor-text')}>
          {leadingIcon && (
            <Icon
              icon={leadingIcon}
              className={clsx(
                leadingIconClassName,
                'transition-transform duration-150',
                open && 'rotate-180'
              )}
            />
          )}
          <input
            type="text"
            value={open ? query : ''}
            placeholder={label}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            className="flex-1 bg-transparent outline-none text-contrast placeholder:text-contrast-light min-w-0"
          />
          {!hideChevron && (
            <button
              type="button"
              aria-label={open ? 'Close' : 'Open'}
              onClick={() => (open ? close() : setOpen(true))}
              className="shrink-0 cursor-pointer"
            >
              <Icon
                icon={chevronDownIcon}
                className={clsx(
                  'w-4 h-4 transition-transform duration-150',
                  open && 'rotate-180'
                )}
              />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={clsx(triggerClass, 'cursor-pointer')}
        >
          {leadingIcon && (
            <Icon
              icon={leadingIcon}
              className={clsx(
                leadingIconClassName,
                'transition-transform duration-150',
                open && 'rotate-180'
              )}
            />
          )}
          <span className="truncate flex-1">{label}</span>
          {!hideChevron && (
            <Icon
              icon={chevronDownIcon}
              className={clsx(
                'w-4 h-4 shrink-0 transition-transform duration-150',
                open && 'rotate-180'
              )}
            />
          )}
        </button>
      )}

      {open && (
        <div
          className={clsx(
            'absolute left-0 right-0 z-30 max-h-[40vh] overflow-y-auto bg-body shadow-lg rounded-md py-2 border border-contrast/10',
            placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
            panelClassName
          )}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-2 text-xs text-contrast-light">
              {emptyLabel}
            </div>
          ) : (
            filtered.map((item) => {
              const content = (
                <>
                  <span className="truncate">{item.label}</span>
                  {showCount && typeof item.count === 'number' && (
                    <span className="text-contrast-light shrink-0">
                      {item.count}
                    </span>
                  )}
                </>
              )
              const baseClass =
                'w-full flex items-center justify-between gap-3 px-4 py-2 text-xs text-contrast hover:bg-contrast/5 transition-colors text-left'
              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      onSelect?.(item)
                      close()
                    }}
                    className={baseClass}
                  >
                    {content}
                  </Link>
                )
              }
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.onClick?.()
                    onSelect?.(item)
                    close()
                  }}
                  className={clsx(baseClass, 'cursor-pointer')}
                >
                  {content}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
