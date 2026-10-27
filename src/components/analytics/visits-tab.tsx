'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import {
  Badge,
  Pager,
  actionRowClass,
  cellClass,
  formatTime,
  inputClass,
  plural,
  quietButtonClass,
  tableClass,
  tableScrollClass,
} from '@/components/mailing/parts'
import { MailingSessionExpired, mailingCall } from '@/hooks/use-mailing'
import type { VisitLogPage, VisitRow } from '@/utils/page-view-types'
import { countryName, flagOf } from './places'

// What the log is narrowed to: one address, one page, both, or neither.
export type VisitFilter = { ip: string; path: string }

// Where a view came from: the campaign its link was tagged with, else the
// site it came from. A visit with neither was typed in or bookmarked; a view
// that is not a visit came from another page of this site.
function source(row: VisitRow): string {
  if (row.utmSource || row.utmMedium || row.utmCampaign) {
    return [row.utmSource, row.utmMedium, row.utmCampaign].filter(Boolean).join(' / ')
  }
  if (row.referrer) return row.referrer
  return row.isVisit ? 'Direct' : 'Within the site'
}

interface VisitsTabProps {
  filter: VisitFilter
  onFilter: (filter: VisitFilter) => void
  // Changes when Refresh is pressed, and the page is read again.
  refreshed: number
  onExpired: () => void
}

// The log: every page view the site has recorded, newest first, with where
// it came from and the address it came from.
export function VisitsTab({ filter, onFilter, refreshed, onExpired }: VisitsTabProps) {
  const [page, setPage] = useState(1)
  const [typed, setTyped] = useState('')
  // What was typed, once the typing has stopped.
  const [search, setSearch] = useState('')
  const [read, setRead] = useState<{ wanted: string; visits: VisitLogPage } | null>(null)
  const [problem, setProblem] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(typed.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [typed])

  const wanted = `${page}|${filter.ip}|${filter.path}|${search}|${refreshed}`

  useEffect(() => {
    let stale = false
    const query = new URLSearchParams({ page: String(page) })
    if (filter.ip) query.set('ip', filter.ip)
    if (filter.path) query.set('path', filter.path)
    if (search) query.set('search', search)

    mailingCall<VisitLogPage>(`/api/analytics/visits/?${query}`)
      .then((visits) => {
        if (stale) return
        setRead({ wanted, visits })
        setProblem('')
      })
      .catch((error: unknown) => {
        if (stale) return
        if (error instanceof MailingSessionExpired) onExpired()
        else setProblem((error as Error).message || 'Something went wrong.')
      })
    return () => {
      stale = true
    }
  }, [page, filter.ip, filter.path, search, wanted, onExpired])

  const visits = read?.visits
  const waiting = read?.wanted !== wanted && !problem

  const narrow = (next: VisitFilter) => {
    onFilter(next)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-3 sm:h-full">
      <div className={actionRowClass}>
        <input
          type="search"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="Find an IP address or a page"
          aria-label="Find an IP address or a page"
          className={clsx(inputClass, 'sm:max-w-xs')}
        />
        {filter.ip && (
          <button
            type="button"
            className={quietButtonClass}
            onClick={() => narrow({ ...filter, ip: '' })}
          >
            Only {filter.ip} · show everyone
          </button>
        )}
        {filter.path && (
          <button
            type="button"
            className={quietButtonClass}
            onClick={() => narrow({ ...filter, path: '' })}
          >
            Only this post · show every page
          </button>
        )}
        <Span fontSize="text-xs" color="text-contrast-light" role="status" aria-live="polite">
          {waiting || !visits ? 'Reading…' : plural(visits.total, 'view')}
        </Span>
      </div>

      {problem && (
        <Paragraph margin="mb-0" fontSize="text-xs" color="text-accent">
          {problem}
        </Paragraph>
      )}

      <div className={tableScrollClass}>
        <table className={tableClass}>
          <thead className="sticky top-0 z-10 bg-body [&>tr]:bg-accent/5">
            <tr>
              <th scope="col" className={cellClass}>Time</th>
              <th scope="col" className={cellClass}>Page</th>
              <th scope="col" className={cellClass}>Came from</th>
              <th scope="col" className={cellClass}>Place</th>
              <th scope="col" className={cellClass}>Browser</th>
              <th scope="col" className={cellClass}>IP address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-contrast/10">
            {visits?.rows.map((row) => (
              <tr key={row.id}>
                <td className={clsx(cellClass, 'whitespace-nowrap')}>
                  {formatTime(row.at)}
                  {row.isVisit && (
                    <Span className="ml-2">
                      <Badge tone="good">Visit</Badge>
                    </Span>
                  )}
                </td>
                <td className={cellClass}>
                  <a
                    href={row.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {row.title}
                  </a>
                </td>
                <td className={cellClass}>{source(row)}</td>
                <td className={cellClass}>
                  {row.country && (
                    <Span aria-hidden="true" className="mr-2">
                      {flagOf(row.country)}
                    </Span>
                  )}
                  {[row.city, row.region, countryName(row.country)].filter(Boolean).join(', ') ||
                    '—'}
                </td>
                <td className={cellClass}>
                  {row.browser} on {row.os} · {row.device}
                </td>
                <td className={cellClass}>
                  {row.ip ? (
                    <button
                      type="button"
                      onClick={() => narrow({ ...filter, ip: row.ip })}
                      title="Show every view from this address"
                      className="cursor-pointer font-semibold tabular-nums hover:underline"
                    >
                      {row.ip}
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {visits && !visits.rows.length && (
              <tr>
                <td className={cellClass} colSpan={6}>
                  No views to show.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {visits && <Pager page={visits.page} pages={visits.pages} onPage={setPage} />}
    </div>
  )
}
