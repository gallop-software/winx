'use client'

import { Suspense, useCallback, useEffect, useRef } from 'react'
import { type AutocompleteApi } from '@algolia/autocomplete-core'
import { usePathname, useSearchParams } from 'next/navigation'
import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react'

import { SearchResults } from './search-results'
import { useAutocomplete } from './use-autocomplete'
import { SearchInput } from './search-input'
import { type Result } from './search-client'

type Autocomplete = AutocompleteApi<
  Result,
  React.SyntheticEvent,
  React.MouseEvent,
  React.KeyboardEvent
>

function CloseOnNavigation({
  close,
  autocomplete,
}: {
  close: (ac: Autocomplete) => void
  autocomplete: Autocomplete
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    close(autocomplete)
  }, [pathname, searchParams, close, autocomplete])
  return null
}

export function Search({
  isOpen = true,
  setIsOpen,
}: {
  isOpen?: boolean
  setIsOpen: (v: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(
    (ac: Autocomplete) => {
      setIsOpen(false)
      ac.setQuery('')
    },
    [setIsOpen]
  )

  const { autocomplete, autocompleteState } = useAutocomplete({
    onClose: close,
  })

  return (
    <>
      <Suspense fallback={null}>
        <CloseOnNavigation
          close={close}
          autocomplete={autocomplete}
        />
      </Suspense>
      <Dialog
        open={isOpen}
        onClose={() => close(autocomplete)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-overlay/50 backdrop-blur-sm" />
        <div className="fixed inset-0 px-4 pt-4 sm:px-6 pb-28 sm:pt-20 md:py-32 lg:px-8 lg:py-[15vh] flex items-start">
          <DialogPanel className="mx-auto w-full transform-gpu overflow-hidden rounded-xl bg-body shadow-xl sm:max-w-xl flex flex-col max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-10)] md:max-h-[calc(100vh-16rem)] lg:max-h-[calc(100vh-30vh)]">
            {/* Root & Form props from autocomplete */}
            <div
              {...autocomplete.getRootProps({})}
              className="flex flex-col flex-1 min-h-0"
            >
              <form
                {...autocomplete.getFormProps({
                  inputElement: inputRef.current,
                })}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="flex-shrink-0">
                  <SearchInput
                    ref={inputRef}
                    autocomplete={autocomplete}
                    autocompleteState={autocompleteState}
                    onEscape={() => setIsOpen(false)}
                  />
                </div>

                <div
                  className="mt-0 flex-1 overflow-auto rounded-none border-0 empty:hidden scrollbar-hide bg-body2 p-2 min-h-0 [-webkit-overflow-scrolling:touch]"
                  {...autocomplete.getPanelProps({})}
                >
                  {'isOpen' in autocompleteState &&
                    autocompleteState.isOpen &&
                    autocompleteState.collections[0] && (
                      <SearchResults
                        autocomplete={autocomplete}
                        query={autocompleteState.query}
                        collection={autocompleteState.collections[0]}
                        onResultClick={() => setIsOpen(false)}
                      />
                    )}
                </div>
              </form>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
