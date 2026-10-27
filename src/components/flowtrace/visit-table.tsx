'use client'

import clsx from 'clsx'
import { countryName, flagOf } from '@/components/analytics/places'
import {
  Badge,
  cellClass,
  formatTime,
  tableClass,
  tableScrollClass,
} from '@/components/mailing/parts'
import { Span } from '@/components/span'
import { conversionLabel, sourceOf } from '@/utils/flow-trace-format'
import type { FtReportStatus, FtVisit } from '@/utils/flow-trace-types'

// How a visit's report email stands, as a word and a tone.
export const REPORT_STATUS: Record<
  FtReportStatus,
  { label: string; tone: 'plain' | 'good' | 'strong' | 'warn' }
> = {
  sent: { label: 'Emailed', tone: 'good' },
  waiting: { label: 'Waiting to send', tone: 'plain' },
  failed: { label: 'Not sent', tone: 'warn' },
  capped: { label: 'Over the hourly limit', tone: 'plain' },
  nobody: { label: 'Nobody to email', tone: 'plain' },
}

interface VisitTableProps {
  visits: FtVisit[]
  onOpen: (id: string) => void
  // Narrows the list to one address, when the list can be narrowed.
  onIp?: (ip: string) => void
  empty: string
  // Fills the height it is given, as the Converted visits tab does; in the
  // Overview it is as tall as its rows.
  fill?: boolean
}

// Converted visits, newest first, in the analytics' visit log's table: when,
// what they did, where they came from, the place, and how the report email
// went. A row opens the visit's report.
export function VisitTable({
  visits,
  onOpen,
  onIp,
  empty,
  fill = false,
}: VisitTableProps) {
  return (
    <div className={clsx(tableScrollClass, !fill && 'sm:flex-none')}>
      <table className={tableClass}>
        <thead className="sticky top-0 z-10 bg-body [&>tr]:bg-accent/5">
          <tr>
            <th
              scope="col"
              className={cellClass}
            >
              Time
            </th>
            <th
              scope="col"
              className={cellClass}
            >
              Converted by
            </th>
            <th
              scope="col"
              className={cellClass}
            >
              Came from
            </th>
            <th
              scope="col"
              className={cellClass}
            >
              Place
            </th>
            <th
              scope="col"
              className={cellClass}
            >
              Pages
            </th>
            <th
              scope="col"
              className={cellClass}
            >
              Email
            </th>
            <th
              scope="col"
              className={cellClass}
            >
              IP address
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-contrast/10">
          {visits.map((visit) => {
            const status = REPORT_STATUS[visit.reportStatus]
            return (
              <tr key={visit.id}>
                <td className={clsx(cellClass, 'whitespace-nowrap')}>
                  <button
                    type="button"
                    onClick={() => onOpen(visit.id)}
                    title="Open this visit's report"
                    className="cursor-pointer font-semibold hover:underline"
                  >
                    {formatTime(visit.startedAt)}
                  </button>
                </td>
                <td className={cellClass}>
                  <button
                    type="button"
                    onClick={() => onOpen(visit.id)}
                    className="cursor-pointer text-left hover:underline"
                  >
                    {conversionLabel(visit.firstConversion)}
                    {visit.conversions > 1 && (
                      <Span color="text-contrast-light">
                        {' '}
                        +{visit.conversions - 1}
                      </Span>
                    )}
                  </button>
                </td>
                <td className={cellClass}>{sourceOf(visit)}</td>
                <td className={cellClass}>
                  {visit.country && (
                    <Span
                      aria-hidden="true"
                      className="mr-2"
                    >
                      {flagOf(visit.country)}
                    </Span>
                  )}
                  {[visit.city, visit.region, countryName(visit.country)]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </td>
                <td className={clsx(cellClass, 'tabular-nums')}>
                  {visit.pageviews}
                </td>
                <td className={clsx(cellClass, 'whitespace-nowrap')}>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </td>
                <td className={cellClass}>
                  {visit.ip && onIp ? (
                    <button
                      type="button"
                      onClick={() => onIp(visit.ip)}
                      title="Show every converted visit from this address"
                      className="cursor-pointer font-semibold tabular-nums hover:underline"
                    >
                      {visit.ip}
                    </button>
                  ) : (
                    visit.ip || '—'
                  )}
                </td>
              </tr>
            )
          })}
          {!visits.length && (
            <tr>
              <td
                className={cellClass}
                colSpan={7}
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
