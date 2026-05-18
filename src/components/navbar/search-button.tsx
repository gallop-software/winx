import { useEffect, useState, type ReactElement } from 'react'
import searchIcon from '@iconify/icons-lucide/search'
import clsx from 'clsx'
import { Icon } from '@/components/icon'
import { Search } from '@/components/search'

/**
 * Search button component with dropdown
 * Toggles Search visibility and positions it absolutely
 * Manages its own state internally
 * @returns {ReactElement} Search button with dropdown
 */
export function SearchButton({
  enableShortcut = false,
  dark = false,
}: {
  enableShortcut?: boolean
  dark?: boolean
}): ReactElement {
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (isSearching || !enableShortcut) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setIsSearching(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isSearching, enableShortcut])

  return (
    <div className="hidden lg:block">
      <button
        rel="noopener noreferrer"
        className={clsx(
          'rounded-lg transition-colors duration-200 cursor-pointer p-2 outline-none focus:outline-none',
          dark
            ? 'text-body hover:text-body/80 hover:bg-body/10'
            : 'text-accent hover:text-accent-dark hover:bg-contrast-dark/2.5'
        )}
        aria-label="search"
        onClick={() => setIsSearching((prev) => !prev)}
      >
        <Icon
          icon={searchIcon}
          className="h-7 w-7"
        />
      </button>
      <Search
        isOpen={isSearching}
        setIsOpen={setIsSearching}
      />
    </div>
  )
}
