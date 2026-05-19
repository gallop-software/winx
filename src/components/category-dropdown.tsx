'use client'

import { Dropdown, type DropdownItem } from '@/components/dropdown'
import { getAllCategories } from '@/utils/taxonomies'
import type { ComponentProps } from 'react'

type Forwarded = Pick<
  ComponentProps<typeof Dropdown>,
  | 'className'
  | 'buttonClassName'
  | 'panelClassName'
  | 'placement'
  | 'leadingIcon'
  | 'leadingIconClassName'
  | 'hideChevron'
  | 'searchable'
  | 'onSelect'
>

interface CategoryDropdownProps extends Forwarded {
  label?: string
  hideEmpty?: boolean
}

export function CategoryDropdown({
  label = 'Categories',
  hideEmpty = true,
  searchable = true,
  ...rest
}: CategoryDropdownProps) {
  const categories = getAllCategories()
    .filter((c) => (hideEmpty ? (c.count ?? 0) > 0 : true))
    .sort((a, b) => a.name.localeCompare(b.name))

  const items: DropdownItem[] = categories.map((c) => ({
    label: c.name,
    href: `/category/${c.slug}`,
  }))

  return (
    <Dropdown
      label={label}
      items={items}
      searchable={searchable}
      buttonClassName="border border-accent5 shadow-sm"
      {...rest}
    />
  )
}
