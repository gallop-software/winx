import { Fragment } from 'react'
import Link from 'next/link'
import {
  type AutocompleteApi,
  type AutocompleteCollection,
} from '@algolia/autocomplete-core'

import { MARK_END, MARK_START, type Result } from './search-client'
import { renderPostTitle } from '@/utils/post-title'

// Shows the part of a page that matched. The server puts the matched words
// between MARK_START and MARK_END.
function Snippet({ text }: { text: string }) {
  return (
    <>
      {text.split(MARK_START).map((part, i) => {
        if (i === 0) return <Fragment key={i}>{part}</Fragment>
        const end = part.indexOf(MARK_END)
        if (end === -1) return <Fragment key={i}>{part}</Fragment>
        return (
          <Fragment key={i}>
            <mark className="font-bold text-contrast bg-accent/20">
              {part.slice(0, end)}
            </mark>
            {part.slice(end + 1)}
          </Fragment>
        )
      })}
    </>
  )
}

type Autocomplete = AutocompleteApi<
  Result,
  React.SyntheticEvent,
  React.MouseEvent,
  React.KeyboardEvent
>

export function SearchResults({
  autocomplete,
  query,
  collection,
  onResultClick,
}: {
  autocomplete: Autocomplete
  query: string
  collection: AutocompleteCollection<Result>
  onResultClick: () => void
}) {
  if (!collection || collection.items.length === 0) {
    return (
      <div className="px-4 py-10 bg-body text-contrast text-center">
        No results for &ldquo;{query}&rdquo;
      </div>
    )
  }

  return (
    <>
      <ul {...autocomplete.getListProps()}>
        {collection.items.map((result) => {
          if (result.isViewAll) {
            return (
              <li
                key={result.url}
                className="group block cursor-pointer rounded-md px-3 py-2 aria-selected:bg-accent/10"
                {...autocomplete.getItemProps({
                  item: result,
                  source: collection.source,
                })}
              >
                <Link
                  href={result.url}
                  className="block font-semibold text-accent text-xs"
                  onClick={onResultClick}
                >
                  {renderPostTitle(result.title)}
                </Link>
              </li>
            )
          }
        const href = result.url

        // Build breadcrumb hierarchy: Always show pageTitle, then title if it's different (subheading)
        const hierarchy: string[] = []
        if (result.pageTitle) {
          hierarchy.push(result.pageTitle)
          // Only add title as subheading if it's different from pageTitle
          if (result.title && result.title !== result.pageTitle) {
            hierarchy.push(result.title)
          }
        } else if (result.title) {
          // Fallback: if no pageTitle, just show title
          hierarchy.push(result.title)
        }

        return (
          <li
            key={href}
            className="group block cursor-default rounded-md px-3 py-2 aria-selected:bg-accent/10"
            {...autocomplete.getItemProps({
              item: result,
              source: collection.source,
            })}
          >
            <Link
              href={href}
              className="block"
              onClick={onResultClick}
            >
              {/* The matching part, with the matched words highlighted */}
              <div className="text-contrast group-aria-selected:text-contrast text-xs line-clamp-2">
                <Snippet text={result.content || ''} />
              </div>

              {/* Breadcrumb navigation: pageTitle / heading */}
              {hierarchy.length > 0 && (
                <div className="mt-1 text-xs text-contrast/30">
                  {hierarchy.map(
                    (item: string, itemIndex: number, items: string[]) => (
                      <Fragment key={itemIndex}>
                        {item}
                        {itemIndex < items.length - 1 && (
                          <span className="mx-1">/</span>
                        )}
                      </Fragment>
                    )
                  )}
                </div>
              )}
            </Link>
          </li>
        )
      })}
      </ul>
    </>
  )
}
