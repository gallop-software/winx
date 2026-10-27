'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import chevronDown20Solid from '@iconify/icons-heroicons/chevron-down-20-solid'
import chevronUp20Solid from '@iconify/icons-heroicons/chevron-up-20-solid'
import { Icon } from '@/components/icon'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import {
  actionRowClass,
  Badge,
  cellClass,
  Checkbox,
  formatTime,
  inputClass,
  Pager,
  plural,
  quietButtonClass,
  Select,
  tableClass,
  tableScrollClass,
} from '@/components/mailing/parts'
import {
  useSubscriberList,
  type SubscriberQueryState,
  type SubscriberSelection,
} from '@/hooks/use-subscribers'
import type {
  SubscriberCounts,
  SubscriberRow,
  SubscriberSort,
  SubscriberStatus,
  SubscriberStatusFilter,
} from '@/utils/mailing-types'

export const STATUS_LABELS: Record<SubscriberStatus, string> = {
  subscribed: 'Subscribed',
  pending: 'Waiting to confirm',
  unsubscribed: 'Unsubscribed',
  bounced: 'Bounced',
  complained: 'Reported spam',
}

const STATUS_TONES: Record<SubscriberStatus, 'plain' | 'good' | 'strong' | 'warn'> = {
  subscribed: 'good',
  pending: 'plain',
  unsubscribed: 'plain',
  bounced: 'warn',
  complained: 'warn',
}

const FILTER_LABELS: Record<SubscriberStatusFilter, string> = {
  all: 'Everyone',
  subscribed: 'Subscribed',
  pending: 'Waiting to confirm',
  unsubscribed: 'Unsubscribed',
  bounced: 'Bounced',
  complained: 'Reported spam',
}

export const SOURCE_LABELS: Record<SubscriberRow['source'], string> = {
  signup: 'Sign-up form',
  member: 'Member',
  admin: 'Added by you',
}

export function StatusBadge({ status }: { status: SubscriberStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
}

export function fullName(row: { firstName: string; lastName: string }) {
  return `${row.firstName} ${row.lastName}`.trim()
}

interface SubscriberTableProps {
  // manage: the Subscribers tab, every status. pick: the Audience tab of the marketing
  // dialog, subscribed only.
  mode: 'manage' | 'pick'
  selected: Set<number>
  onSelectedChange: (next: Set<number>) => void
  // Everyone matching the filter is selected, not only the rows ticked.
  allMatching?: boolean
  onAllMatchingChange?: (all: boolean) => void
  onOpen?: (row: SubscriberRow) => void
  // Tells the page what an action on "everyone matching" applies to.
  onSelectionChange?: (selection: SubscriberSelection | null, count: number) => void
  onCounts?: (counts: SubscriberCounts) => void
  // The filter on screen, for the export.
  onFilter?: (filter: { status: SubscriberStatusFilter; search: string }) => void
  onExpired: () => void
  // Changing it reads the list again, after the page changed something.
  version?: number
}

export function SubscriberTable({
  mode,
  selected,
  onSelectedChange,
  allMatching = false,
  onAllMatchingChange,
  onOpen,
  onSelectionChange,
  onCounts,
  onFilter,
  onExpired,
  version = 0,
}: SubscriberTableProps) {
  const [query, setQuery] = useState<SubscriberQueryState>({
    status: mode === 'pick' ? 'subscribed' : 'all',
    search: '',
    sort: 'added',
    descending: true,
    page: 1,
  })
  const list = useSubscriberList(query)
  const { reload } = list

  useEffect(() => {
    if (version) reload()
  }, [version, reload])

  useEffect(() => {
    if (list.expired) onExpired()
  }, [list.expired, onExpired])

  useEffect(() => {
    onCounts?.(list.counts)
  }, [list.counts, onCounts])

  useEffect(() => {
    onFilter?.({ status: query.status, search: query.search })
  }, [query.status, query.search, onFilter])

  useEffect(() => {
    if (!onSelectionChange) return
    if (allMatching) {
      onSelectionChange({ query: { status: query.status, search: query.search } }, list.total)
    } else {
      onSelectionChange(selected.size ? { ids: [...selected] } : null, selected.size)
    }
  }, [allMatching, selected, query.status, query.search, list.total, onSelectionChange])

  const change = (next: Partial<SubscriberQueryState>) => {
    setQuery((before) => ({ ...before, page: 1, ...next }))
    onAllMatchingChange?.(false)
  }

  const sortBy = (sort: SubscriberSort) => {
    setQuery((before) => ({
      ...before,
      page: 1,
      sort,
      descending: before.sort === sort ? !before.descending : sort === 'added' || sort === 'opened',
    }))
  }

  const pageIds = list.rows.map((row) => row.id)
  const tickedHere = pageIds.filter((id) => selected.has(id)).length
  const pages = Math.max(1, Math.ceil(list.total / list.perPage))

  const tickPage = (checked: boolean) => {
    const next = new Set(selected)
    for (const id of pageIds) {
      if (checked) next.add(id)
      else next.delete(id)
    }
    onSelectedChange(next)
    if (!checked) onAllMatchingChange?.(false)
  }

  const tick = (id: number, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    onSelectedChange(next)
    if (!checked) onAllMatchingChange?.(false)
  }

  const heading = (sort: SubscriberSort, label: string) => (
    <th
      scope="col"
      className={cellClass}
      aria-sort={query.sort === sort ? (query.descending ? 'descending' : 'ascending') : 'none'}
    >
      <button
        type="button"
        onClick={() => sortBy(sort)}
        className="inline-flex items-center gap-1 cursor-pointer font-semibold"
      >
        {label}
        {query.sort === sort && (
          <Icon className="w-4 h-4" icon={query.descending ? chevronDown20Solid : chevronUp20Solid} />
        )}
      </button>
    </th>
  )

  const columns = mode === 'manage' ? 7 : 5

  return (
    <div className="flex flex-col gap-3 sm:h-full sm:min-h-0">
      <div className={actionRowClass}>
        <input
          type="search"
          value={query.search}
          onChange={(event) => change({ search: event.target.value })}
          placeholder="Search by email or name"
          aria-label="Search by email or name"
          className={clsx(inputClass, 'sm:max-w-xs')}
        />
        {mode === 'manage' && (
          <Select
            value={query.status}
            onChange={(event) => change({ status: event.target.value as SubscriberStatusFilter })}
            aria-label="Show"
            className="sm:max-w-64"
          >
            {(Object.keys(FILTER_LABELS) as SubscriberStatusFilter[]).map((status) => (
              <option key={status} value={status}>
                {FILTER_LABELS[status]} ({list.counts[status].toLocaleString()})
              </option>
            ))}
          </Select>
        )}
        <button type="button" className={quietButtonClass} onClick={reload} disabled={list.loading}>
          Refresh
        </button>
        <Span fontSize="text-xs" color="text-contrast-light" role="status" aria-live="polite">
          {list.loading ? 'Reading…' : plural(list.total, mode === 'pick' ? 'subscriber' : 'person')}
        </Span>
      </div>

      {tickedHere === pageIds.length && pageIds.length > 0 && list.total > pageIds.length && onAllMatchingChange && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-accent/5 px-3 py-2">
          <Span fontSize="text-xs">
            {allMatching
              ? `All ${list.total.toLocaleString()} matching are selected.`
              : `The ${pageIds.length} on this page are selected.`}
          </Span>
          <button
            type="button"
            className="text-xs font-medium text-accent underline cursor-pointer"
            onClick={() => onAllMatchingChange(!allMatching)}
          >
            {allMatching ? 'Select only this page' : `Select all ${list.total.toLocaleString()} matching`}
          </button>
        </div>
      )}

      {list.error && (
        <Paragraph margin="mb-0" fontSize="text-xs" color="text-accent">
          {list.error}
        </Paragraph>
      )}

      <div className={tableScrollClass}>
        <table className={tableClass}>
          <thead className="sticky top-0 z-10 bg-body [&>tr]:bg-accent/5">
            <tr>
              <th scope="col" className={clsx(cellClass, 'w-8')}>
                <Checkbox
                  label="Select everyone on this page"
                  checked={pageIds.length > 0 && tickedHere === pageIds.length}
                  mixed={tickedHere > 0}
                  disabled={!pageIds.length}
                  onChange={(checked) => tickPage(checked)}
                />
              </th>
              {heading('email', 'Email')}
              {heading('name', 'Name')}
              {mode === 'manage' && heading('status', 'Status')}
              {mode === 'manage' && (
                <th scope="col" className={cellClass}>
                  How they joined
                </th>
              )}
              {heading('added', 'Added')}
              {heading('opened', 'Last opened')}
            </tr>
          </thead>
          <tbody className="divide-y divide-contrast/10">
            {list.rows.map((row) => (
              <tr
                key={row.id}
                className={clsx(
                  (allMatching || selected.has(row.id)) && 'bg-accent/10',
                  onOpen && 'cursor-pointer hover:bg-accent/5'
                )}
                onClick={() => onOpen?.(row)}
              >
                <td className={cellClass} onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    label={`Select ${row.email}`}
                    checked={allMatching || selected.has(row.id)}
                    onChange={(checked) => tick(row.id, checked)}
                  />
                </td>
                <td className={cellClass}>{row.email}</td>
                <td className={cellClass}>{fullName(row) || '—'}</td>
                {mode === 'manage' && (
                  <td className={cellClass}>
                    <StatusBadge status={row.status} />
                  </td>
                )}
                {mode === 'manage' && <td className={cellClass}>{SOURCE_LABELS[row.source]}</td>}
                <td className={clsx(cellClass, 'whitespace-nowrap')}>{formatTime(row.createdAt)}</td>
                <td className={clsx(cellClass, 'whitespace-nowrap')}>{formatTime(row.lastOpenedAt)}</td>
              </tr>
            ))}
            {!list.loading && !list.rows.length && (
              <tr>
                <td colSpan={columns} className={clsx(cellClass, 'py-8 text-center text-contrast-light')}>
                  {list.counts.all === 0
                    ? 'Nobody is on the list yet.'
                    : 'Nobody matches.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pager
        page={Math.min(query.page, pages)}
        pages={pages}
        onPage={(page) => setQuery((before) => ({ ...before, page }))}
      />
    </div>
  )
}
