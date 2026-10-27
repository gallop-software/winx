'use client'

import { useState } from 'react'
import chevronRight20Solid from '@iconify/icons-heroicons/chevron-right-20-solid'
import clsx from 'clsx'
import { Icon } from '@/components/icon'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import type { ViewListRow } from '@/utils/page-view-types'
import { flagOf } from './places'

// A line of a list as the box shows it. `hint` is what it stands for, shown
// on pointing at it; `members` makes it a group that opens to show them.
export type ListRow = ViewListRow & { hint?: string; members?: ListRow[] }

export type ViewListTab = {
  // Names its tab, and heads the column of labels.
  name: string
  rows: ListRow[]
  empty: string
}

// How many lines show before "View all".
const FOLDED = 10

interface RowProps {
  row: ListRow
  // The largest number in the list, which the bars are measured against.
  most: number
  member?: boolean
  open?: boolean
  onToggle?: () => void
}

function Row({ row, most, member = false, open = false, onToggle }: RowProps) {
  const flag = row.country ? flagOf(row.country) : ''
  const label = (
    <>
      {flag && (
        <Span fontSize="text-xs" aria-hidden="true" className="shrink-0">
          {flag}
        </Span>
      )}
      <Span fontSize="text-xs" className="truncate">
        {row.label}
      </Span>
    </>
  )

  return (
    <tr>
      <td className="relative h-10 p-0">
        <div
          className={clsx(
            'absolute inset-y-0.5 left-0 rounded-sm',
            member ? 'bg-accent/10' : 'bg-accent/20'
          )}
          style={{ width: `${(row.views / most) * 100}%` }}
          aria-hidden="true"
        />
        <div
          className={clsx('relative flex h-full items-center pr-2', member ? 'pl-9' : 'pl-3')}
          title={row.hint ?? row.label}
        >
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
            >
              {label}
              <Icon
                icon={chevronRight20Solid}
                className={clsx('h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')}
              />
            </button>
          ) : row.href ? (
            <a
              href={row.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-2 hover:underline"
            >
              {label}
            </a>
          ) : (
            <div className="flex min-w-0 items-center gap-2">{label}</div>
          )}
        </div>
      </td>
      <td className="w-20 p-0 text-right font-semibold tabular-nums">
        {row.views.toLocaleString()}
      </td>
    </tr>
  )
}

interface ViewListProps {
  title: string
  // What the number beside each line counts.
  counted: string
  // One list, or several to switch between.
  tabs: ViewListTab[]
}

// One card of the overview: what was counted, most first, a shaded bar
// behind each line as long as its share of the largest. Ten lines, and the
// rest on asking.
export function ViewList({ title, counted, tabs }: ViewListProps) {
  const [tab, setTab] = useState(0)
  const [all, setAll] = useState(false)
  const [open, setOpen] = useState<Set<string>>(new Set())

  const shown = tabs[tab] ?? tabs[0]!
  const rows = all ? shown.rows : shown.rows.slice(0, FOLDED)
  const most = Math.max(1, ...shown.rows.map((row) => row.views))

  const toggle = (key: string) => {
    const next = new Set(open)
    if (!next.delete(key)) next.add(key)
    setOpen(next)
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-contrast/15 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Span fontSize="text-sm" fontWeight="font-semibold">
          {title}
        </Span>
        {tabs.length > 1 && (
          <div className="inline-flex overflow-hidden rounded-md border border-contrast/20">
            {tabs.map((item, index) => (
              <button
                key={item.name}
                type="button"
                aria-pressed={index === tab}
                onClick={() => {
                  setTab(index)
                  setAll(false)
                }}
                className={clsx(
                  'cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors',
                  index > 0 && 'border-l border-contrast/20',
                  index === tab
                    ? 'bg-accent text-accent-contrast'
                    : 'bg-body text-contrast hover:bg-accent/5'
                )}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {shown.rows.length ? (
        <table className="w-full table-fixed text-xs">
          <thead>
            <tr>
              <th scope="col" className="pb-2 text-left font-semibold">
                {shown.name}
              </th>
              <th scope="col" className="w-20 pb-2 text-right font-semibold">
                {counted}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((row) => {
              if (!row.members) return [<Row key={row.key} row={row} most={most} />]
              const isOpen = open.has(row.key)
              return [
                <Row
                  key={row.key}
                  row={row}
                  most={most}
                  open={isOpen}
                  onToggle={() => toggle(row.key)}
                />,
                ...(isOpen
                  ? row.members.map((member) => (
                      <Row key={`${row.key}/${member.key}`} row={member} most={most} member />
                    ))
                  : []),
              ]
            })}
          </tbody>
        </table>
      ) : (
        <Paragraph margin="mb-0" fontSize="text-xs" color="text-contrast-light">
          {shown.empty}
        </Paragraph>
      )}

      {shown.rows.length > FOLDED && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="cursor-pointer self-start text-xs font-semibold hover:underline"
        >
          {all ? 'Show fewer' : 'View all'}
        </button>
      )}
    </div>
  )
}
