import { Fragment } from 'react'
import Link from 'next/link'
import Highlighter from 'react-highlight-words'
import {
  type AutocompleteApi,
  type AutocompleteCollection,
} from '@algolia/autocomplete-core'

import { type Result } from './search-client'

/**
 * Extract context around the search query from content
 * @param content - The full content text
 * @param query - The search query
 * @param contextLength - Number of characters to show on each side
 * @returns Excerpt with query in context, or beginning of content
 */
function getContextExcerpt(
  content: string,
  query: string,
  contextLength: number = 60
): string {
  if (!content || !query) return content?.slice(0, 120) || ''

  // Find the query position (case-insensitive)
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerContent.indexOf(lowerQuery)

  if (index === -1) {
    // Query not found, return beginning
    return content.slice(0, 120)
  }

  // Calculate start and end positions
  const start = Math.max(0, index - contextLength)
  const end = Math.min(content.length, index + query.length + contextLength)

  // Extract excerpt
  let excerpt = content.slice(start, end)

  // Add ellipsis if needed
  if (start > 0) excerpt = '...' + excerpt
  if (end < content.length) excerpt = excerpt + '...'

  return excerpt
}

/**
 * Highlight matching text in a string using react-highlight-words
 */
function HighlightQuery({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>

  return (
    <Highlighter
      searchWords={[query]}
      autoEscape={true}
      textToHighlight={text}
      highlightClassName="font-bold text-contrast bg-yellow-200"
    />
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
      <div className="px-4 py-10 bg-body2 text-contrast text-center">
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
                className="group block cursor-pointer rounded-md px-3 py-2 aria-selected:bg-accent4"
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
                  {result.title}
                </Link>
              </li>
            )
          }
        const href = result.url
        const excerpt = getContextExcerpt(result.content || '', query, 60)

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
            className="group block cursor-default rounded-md px-3 py-2 aria-selected:bg-accent4"
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
              {/* Context excerpt with highlighted query */}
              <div className="text-contrast group-aria-selected:text-contrast text-xs line-clamp-2">
                <HighlightQuery
                  text={excerpt}
                  query={query}
                />
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
