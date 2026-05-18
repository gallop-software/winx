'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icon'
import { Search } from '@/components/search'
import magnifyingGlassIcon from '@iconify/icons-heroicons/magnifying-glass'
import chevronDownIcon from '@iconify/icons-heroicons/chevron-down'
import clsx from 'clsx'

interface BlogSearchProps {
  categories: { name: string; slug: string }[]
}

export function BlogSearch({ categories }: BlogSearchProps) {
  const router = useRouter()
  const [isSearching, setIsSearching] = useState(false)

  const onCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const slug = e.target.value
    if (slug) router.push(`/category/${slug}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => setIsSearching(true)}
        className="w-full flex items-center gap-3 bg-body text-contrast-light px-6 py-4 mb-4 shadow-md rounded-md cursor-pointer text-left"
      >
        <Icon
          icon={magnifyingGlassIcon}
          className="w-5 h-5 shrink-0"
        />
        <span>Search Douglas Newby articles...</span>
      </button>

      <div className="relative bg-body shadow-md rounded-md">
        <select
          defaultValue=""
          onChange={onCategoryChange}
          className={clsx(
            'w-full appearance-none bg-transparent text-contrast px-6 py-4 outline-none cursor-pointer',
            'pr-12'
          )}
        >
          <option value="">
            Select a category to read additional articles by Douglas Newby...
          </option>
          {categories.map((c) => (
            <option
              key={c.slug}
              value={c.slug}
            >
              {c.name}
            </option>
          ))}
        </select>
        <Icon
          icon={chevronDownIcon}
          className="w-5 h-5 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-contrast"
        />
      </div>

      <Search
        isOpen={isSearching}
        setIsOpen={setIsSearching}
      />
    </div>
  )
}
