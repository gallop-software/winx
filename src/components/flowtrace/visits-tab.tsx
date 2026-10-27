'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { PERIODS } from '@/components/analytics/overview-tab'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import {
  Pager,
  Select,
  actionRowClass,
  inputClass,
  plural,
  quietButtonClass,
} from '@/components/mailing/parts'
import { useFlowTraceRead } from '@/hooks/use-flow-trace'
import type { FtVisitPage } from '@/utils/flow-trace-types'
import type { ViewPeriod } from '@/utils/page-view-types'
import { VisitTable } from './visit-table'

interface VisitsTabProps {
  onOpenVisit: (id: string) => void
  onExpired: () => void
  refreshed: number
}

// Every converted visit, newest first, as the analytics' Visits tab shows
// views: a period, a search for an address or a page, one address at a
// time, and pages of 50. Only visits that converted are here; every view is
// in Analytics.
export function VisitsTab({
  onOpenVisit,
  onExpired,
  refreshed,
}: VisitsTabProps) {
  const [period, setPeriod] = useState<ViewPeriod>('all')
  const [typed, setTyped] = useState('')
  // What was typed, once the typing has stopped.
  const [search, setSearch] = useState('')
  const [ip, setIp] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(typed.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [typed])

  const query = new URLSearchParams({ period, page: String(page) })
  if (ip) query.set('ip', ip)
  if (search) query.set('search', search)
  const read = useFlowTraceRead<FtVisitPage>(
    `/api/flowtrace/visits/?${query}`,
    onExpired,
    refreshed
  )
  const visits = read.value

  return (
    <div className="flex flex-col gap-3 sm:h-full">
      <div className={actionRowClass}>
        <Select
          value={period}
          onChange={(event) => {
            setPeriod(event.target.value as ViewPeriod)
            setPage(1)
          }}
          aria-label="Period"
          className="sm:max-w-52"
        >
          {(Object.keys(PERIODS) as ViewPeriod[]).map((key) => (
            <option
              key={key}
              value={key}
            >
              {PERIODS[key]}
            </option>
          ))}
        </Select>
        <input
          type="search"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="Find an IP address or a page"
          aria-label="Find an IP address or a page"
          className={clsx(inputClass, 'sm:max-w-xs')}
        />
        {ip && (
          <button
            type="button"
            className={quietButtonClass}
            onClick={() => {
              setIp('')
              setPage(1)
            }}
          >
            Only {ip} · show everyone
          </button>
        )}
        <Span
          fontSize="text-xs"
          color="text-contrast-light"
          role="status"
          aria-live="polite"
        >
          {read.waiting || !visits
            ? 'Reading…'
            : plural(visits.total, 'converted visit')}
        </Span>
      </div>

      {read.problem && (
        <Paragraph
          margin="mb-0"
          fontSize="text-xs"
          color="text-accent"
        >
          {read.problem}
        </Paragraph>
      )}

      <VisitTable
        visits={visits?.rows ?? []}
        onOpen={onOpenVisit}
        onIp={(value) => {
          setIp(value)
          setPage(1)
        }}
        empty={visits ? 'No converted visits to show.' : 'Reading…'}
        fill
      />

      {visits && (
        <Pager
          page={visits.page}
          pages={visits.pages}
          onPage={setPage}
        />
      )}
    </div>
  )
}
