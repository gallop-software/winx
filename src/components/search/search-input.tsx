import { forwardRef } from 'react'
import {
  type AutocompleteApi,
  type AutocompleteState,
} from '@algolia/autocomplete-core'
import searchIcon from '@iconify/icons-lucide/search'
import clsx from 'clsx'

import { Icon } from '@/components/icon'
import { LoadingIcon } from './loading-icon'
import { type Result } from './search-client'

type EmptyObject = Record<string, never>

type Autocomplete = AutocompleteApi<
  Result,
  React.SyntheticEvent,
  React.MouseEvent,
  React.KeyboardEvent
>

export const SearchInput = forwardRef<
  HTMLInputElement,
  {
    autocomplete: Autocomplete
    autocompleteState: AutocompleteState<Result> | EmptyObject
    onEscape: () => void
  }
>(function SearchInput({ autocomplete, autocompleteState, onEscape }, ref) {
  const inputProps = autocomplete.getInputProps({ inputElement: null })
  return (
    <div className="group relative flex h-18">
      <Icon
        icon={searchIcon}
        className="pointer-events-none absolute top-0 left-4 h-full w-5 text-contrast"
      />
      <input
        ref={ref}
        data-autofocus
        className={clsx(
          'flex-auto appearance-none bg-transparent pl-12 text-contrast outline-hidden placeholder:text-contrast focus:w-full focus:flex-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden',
          autocompleteState.status === 'stalled' ? 'pr-11' : 'pr-4'
        )}
        {...inputProps}
        onKeyDown={(event) => {
          if (
            event.key === 'Escape' &&
            !('isOpen' in autocompleteState && autocompleteState.isOpen) &&
            ('query' in autocompleteState
              ? autocompleteState.query === ''
              : true)
          ) {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur()
            }
            onEscape()
          } else {
            inputProps.onKeyDown(event)
          }
        }}
      />
      {'status' in autocompleteState &&
        autocompleteState.status === 'stalled' && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            <LoadingIcon className="h-6 w-6 animate-spin stroke-contrast text-contrast" />
          </div>
        )}
    </div>
  )
})
