'use client'

import { useState } from 'react'
import chevronRight20Solid from '@iconify/icons-heroicons/chevron-right-20-solid'
import documentText20Solid from '@iconify/icons-heroicons/document-text-20-solid'
import eye20Solid from '@iconify/icons-heroicons/eye-20-solid'
import users20Solid from '@iconify/icons-heroicons/users-20-solid'
import clsx from 'clsx'
import { DateTime } from 'luxon'
import { Icon } from '@/components/icon'
import { Span } from '@/components/span'
import { plural } from '@/components/mailing/parts'
import type { ViewBucket } from '@/utils/page-view-types'

export type BucketUnit = 'hour' | 'day' | 'month'

// An hour, a day or a month as the chart names it: short under a bar, in
// full in the box that reads a bar out.
export function bucketLabel(key: string, unit: BucketUnit, form: 'short' | 'long' = 'long'): string {
  const date = DateTime.fromISO(key)
  if (!date.isValid) return key
  if (unit === 'month') return date.toFormat(form === 'short' ? 'LLL yyyy' : 'LLLL yyyy')
  if (unit === 'hour') {
    if (form === 'short') return date.toFormat('h a')
    return `${date.toFormat('LLLL d, h a')}–${date.plus({ hours: 1 }).toFormat('h a')}`
  }
  return date.toFormat(form === 'short' ? 'LLL d' : 'LLLL d, yyyy')
}

// The top of the scale: the largest value rounded up to a round number whose
// half is a whole number too, since the half is the middle line.
function scaleTop(largest: number): number {
  if (largest <= 10) return Math.max(2, Math.ceil(largest / 2) * 2)
  const magnitude = 10 ** Math.floor(Math.log10(largest))
  for (const step of [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8]) {
    if (step * magnitude >= largest) return step * magnitude
  }
  return 10 * magnitude
}

// The dates under the bars: every one while they fit, then evenly spaced
// ones, counted back from the latest so that one is always named.
const MOST_LABELS = 14

function barHeight(value: number, top: number): string {
  return value > 0 ? `max(2px, ${(value / top) * 100}%)` : '0'
}

interface ReadOutProps {
  bucket: ViewBucket
  unit: BucketUnit
}

// The dark box beside a bar: its date, its numbers, and the posts published
// that day.
function ReadOut({ bucket, unit }: ReadOutProps) {
  const each = bucket.visitors > 0 ? (bucket.views / bucket.visitors).toFixed(2) : '—'
  const lines = [
    { icon: eye20Solid, label: 'Views', value: bucket.views.toLocaleString() },
    { icon: users20Solid, label: 'Visitors', value: bucket.visitors.toLocaleString() },
    { icon: chevronRight20Solid, label: 'Views per visitor', value: each },
  ]
  const published = bucket.published ?? []

  return (
    <div className="flex flex-col gap-2">
      <Span fontSize="text-xs" fontWeight="font-semibold" color="text-overlay-text">
        {bucketLabel(bucket.key, unit)}
      </Span>
      {lines.map((line) => (
        <div key={line.label} className="flex items-center gap-2">
          <Icon icon={line.icon} className="h-4 w-4 shrink-0 text-overlay-text/70" />
          <Span fontSize="text-xs" color="text-overlay-text" className="flex-1">
            {line.label}
          </Span>
          <Span
            fontSize="text-xs"
            fontWeight="font-semibold"
            color="text-overlay-text"
            className="tabular-nums"
          >
            {line.value}
          </Span>
        </div>
      ))}
      {published.length > 0 && (
        <div className="flex gap-2">
          <Icon icon={documentText20Solid} className="mt-0.5 h-4 w-4 shrink-0 text-overlay-text/70" />
          <div className="flex min-w-0 flex-col">
            <Span fontSize="text-xs" color="text-overlay-text">
              {published.length === 1 ? 'Post published:' : 'Posts published:'}
            </Span>
            {published.slice(0, 3).map((title) => (
              <Span
                key={title}
                fontSize="text-xs"
                fontWeight="font-semibold"
                color="text-overlay-text"
                className="truncate"
              >
                {title}
              </Span>
            ))}
            {published.length > 3 && (
              <Span fontSize="text-xs" color="text-overlay-text">
                and {published.length - 3} more
              </Span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface BarChartProps {
  buckets: ViewBucket[]
  unit: BucketUnit
  // The bar that was pressed, which the lists below are narrowed to.
  selected: string | null
  onSelect: (key: string | null) => void
  // What sits at the left of the heading: the period to show.
  controls: React.ReactNode
}

// Views and visitors for each hour, day or month. Each is one column: a wide bar
// for its views and, inside it, a narrower darker one for its visitors.
// Pointing at a column, or reaching it with the keyboard, reads it out in a
// box beside it; pressing it narrows the lists below to it, and pressing it
// again lets them go.
export function BarChart({ buckets, unit, selected, onSelect, controls }: BarChartProps) {
  const [pointed, setPointed] = useState<string | null>(null)
  const [showVisitors, setShowVisitors] = useState(true)

  const count = buckets.length
  const top = scaleTop(Math.max(1, ...buckets.map((bucket) => bucket.views)))
  const readIndex = buckets.findIndex((bucket) => bucket.key === pointed)
  const read = buckets[readIndex]
  const every = count <= MOST_LABELS ? 1 : Math.ceil(count / 7)
  // On a narrow screen there is room for four or so: every second or third
  // of the ones above.
  const everyNarrow = every * Math.ceil(count / 4 / every)
  // Which bars are named: counted back from the latest for days and months,
  // so that the last is always named; from midnight for hours, so that a day
  // reads 12 AM, 4 AM, 8 AM and so on.
  const place = (index: number) => (unit === 'hour' ? index : count - 1 - index)
  // Past this many, the columns are too thin for bars with air beside them.
  const crowded = count > 45

  return (
    <div className="rounded-md border border-contrast/15">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-contrast/15 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{controls}</div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-3.5 rounded-sm bg-contrast/15" aria-hidden="true" />
            <Span fontSize="text-xs">Views</Span>
          </div>
          {/* Pressing it takes the visitors' bars off the chart, and puts
              them back. */}
          <button
            type="button"
            onClick={() => setShowVisitors(!showVisitors)}
            aria-pressed={showVisitors}
            title={showVisitors ? 'Hide visitors on the chart' : 'Show visitors on the chart'}
            className="flex cursor-pointer items-center gap-2"
          >
            <div
              className={clsx(
                'h-3.5 w-3.5 rounded-sm border border-accent-light',
                showVisitors && 'bg-accent-light'
              )}
              aria-hidden="true"
            />
            <Span fontSize="text-xs" color={showVisitors ? '' : 'text-contrast-light'}>
              Visitors
            </Span>
          </button>
        </div>
      </div>

      <div className="px-4 pb-3 pt-5">
        <div className="flex">
          <div className="relative h-56 min-w-0 flex-1">
            <div className="absolute inset-x-0 top-0 border-t border-contrast/10" />
            <div className="absolute inset-x-0 top-1/2 border-t border-contrast/10" />
            <div className="absolute inset-x-0 bottom-0 border-t border-contrast/25" />

            <div
              role="group"
              aria-label={`Views and visitors each ${unit}`}
              className="absolute inset-0 flex"
            >
              {buckets.map((bucket) => {
                const isSelected = bucket.key === selected
                const posts = bucket.published?.length
                  ? `. Published: ${bucket.published.join(', ')}`
                  : ''
                return (
                  <button
                    key={bucket.key}
                    type="button"
                    onClick={() => onSelect(isSelected ? null : bucket.key)}
                    onPointerEnter={() => setPointed(bucket.key)}
                    onPointerLeave={() => setPointed(null)}
                    onFocus={() => setPointed(bucket.key)}
                    onBlur={() => setPointed(null)}
                    aria-pressed={isSelected}
                    aria-label={`${bucketLabel(bucket.key, unit)}: ${plural(bucket.views, 'view')}, ${plural(bucket.visitors, 'visitor')}${posts}`}
                    className={clsx(
                      'relative h-full min-w-0 flex-1 cursor-pointer outline-none transition-colors',
                      isSelected
                        ? 'bg-accent/15'
                        : bucket.key === pointed
                          ? 'bg-accent/5'
                          : ''
                    )}
                  >
                    <div
                      className={clsx(
                        'absolute bottom-0 left-1/2 max-w-20 -translate-x-1/2 rounded-t-sm bg-contrast/15 transition-opacity',
                        crowded ? 'w-[80%]' : 'w-[64%]',
                        selected && !isSelected && 'opacity-50'
                      )}
                      style={{ height: barHeight(bucket.views, top) }}
                    />
                    {showVisitors && (
                      <div
                        className={clsx(
                          'absolute bottom-0 left-1/2 max-w-11 -translate-x-1/2 rounded-t-sm bg-accent-light transition-opacity',
                          crowded ? 'w-[40%]' : 'w-[36%]',
                          selected && !isSelected && 'opacity-50'
                        )}
                        style={{ height: barHeight(bucket.visitors, top) }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {read && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-2 z-10 w-52 rounded-md bg-overlay p-3 shadow-lg sm:w-64"
                // Beside the column, on whichever side has the room.
                style={
                  readIndex < count / 2
                    ? { left: `calc(${((readIndex + 1) / count) * 100}% + 0.5rem)` }
                    : { right: `calc(${((count - readIndex) / count) * 100}% + 0.5rem)` }
                }
              >
                <ReadOut bucket={read} unit={unit} />
              </div>
            )}
          </div>

          <div className="relative h-56 w-16 shrink-0" aria-hidden="true">
            {[
              { at: 'top-0', value: top },
              { at: 'top-1/2', value: top / 2 },
              { at: 'top-full', value: 0 },
            ].map((line) => (
              <Span
                key={line.at}
                fontSize="text-xs"
                color="text-contrast-light"
                className={clsx('absolute right-0 -translate-y-1/2 tabular-nums', line.at)}
              >
                {line.value.toLocaleString()}
              </Span>
            ))}
          </div>
        </div>

        <div className="mt-2 flex" aria-hidden="true">
          <div className="flex min-w-0 flex-1">
            {buckets.map((bucket, index) => (
              <div key={bucket.key} className="flex min-w-0 flex-1 justify-center">
                {place(index) % every === 0 && (
                  <Span
                    fontSize="text-xs"
                    color="text-contrast-light"
                    className={clsx(
                      'whitespace-nowrap',
                      place(index) % everyNarrow !== 0 && 'hidden lg:inline'
                    )}
                  >
                    {bucketLabel(bucket.key, unit, 'short')}
                  </Span>
                )}
              </div>
            ))}
          </div>
          <div className="w-16 shrink-0" />
        </div>
      </div>
    </div>
  )
}
