'use client'

import { useEffect, useState } from 'react'
import arrowDown20Solid from '@iconify/icons-heroicons/arrow-down-20-solid'
import arrowUp20Solid from '@iconify/icons-heroicons/arrow-up-20-solid'
import calendarDays20Solid from '@iconify/icons-heroicons/calendar-days-20-solid'
import eye20Solid from '@iconify/icons-heroicons/eye-20-solid'
import globeAlt20Solid from '@iconify/icons-heroicons/globe-alt-20-solid'
import trophy20Solid from '@iconify/icons-heroicons/trophy-20-solid'
import users20Solid from '@iconify/icons-heroicons/users-20-solid'
import { DateTime } from 'luxon'
import { Grid } from '@/components/grid'
import { Icon } from '@/components/icon'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import { Select, actionRowClass, plural, quietButtonClass } from '@/components/mailing/parts'
import { MailingSessionExpired, mailingCall } from '@/hooks/use-mailing'
import type { PageViewReport, ViewPeriod } from '@/utils/page-view-types'
import { BarChart, bucketLabel } from './bar-chart'
import { countryName } from './places'
import { nameReferrers } from './referrers'
import { ViewList } from './view-list'

export const PERIODS: Record<ViewPeriod, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months',
  all: 'All time',
}

interface TileProps {
  icon: { body: string; width?: number; height?: number }
  label: string
  value: number
  note?: string
  // The same number for the time just before, to show how far it moved.
  before?: number | undefined
}

// One number under the chart. With `before`, an arrow and how much it rose
// or fell since.
export function Tile({ icon, label, value, note, before }: TileProps) {
  const change = before ? Math.round(((value - before) / before) * 100) : null
  return (
    <div className="flex flex-col gap-1 rounded-md bg-accent/5 px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon icon={icon} className="h-4 w-4 shrink-0 text-contrast-light" />
        <Span fontSize="text-xs" color="text-contrast-light">
          {label}
        </Span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <Span fontSize="text-xl" fontWeight="font-semibold" className="tabular-nums">
          {value.toLocaleString()}
        </Span>
        {change !== null && change !== 0 && (
          <Span
            fontSize="text-xs"
            color="text-contrast-light"
            className="inline-flex items-center gap-0.5"
            title="Against the same length of time just before"
          >
            <Icon
              icon={change > 0 ? arrowUp20Solid : arrowDown20Solid}
              className="h-3.5 w-3.5"
            />
            {Math.abs(change).toLocaleString()}%
            <Span className="sr-only">{change > 0 ? 'up' : 'down'}</Span>
          </Span>
        )}
      </div>
      <Span fontSize="text-xs" color="text-contrast-light">
        {note || ' '}
      </Span>
    </div>
  )
}

interface OverviewTabProps {
  // One page's views rather than the whole site's.
  path?: string
  // Shown with `path`: opens the log narrowed to that page.
  onSeeVisits?: () => void
  // Changes when Refresh is pressed, and everything is read again.
  refreshed: number
  onExpired: () => void
}

// The chart, the numbers under it and the lists, for the site or for one
// page.
export function OverviewTab({ path = '', onSeeVisits, refreshed, onExpired }: OverviewTabProps) {
  const [period, setPeriod] = useState<ViewPeriod>('today')
  const [bucket, setBucket] = useState<string | null>(null)
  // What was read, and what it was read for: until the two match, the
  // screen is waiting on a newer answer.
  const [read, setRead] = useState<{ wanted: string; report: PageViewReport } | null>(null)
  const [problem, setProblem] = useState('')

  const wanted = `${period}|${bucket ?? ''}|${path}|${refreshed}`

  useEffect(() => {
    let stale = false
    const query = new URLSearchParams({ period })
    if (bucket) query.set('bucket', bucket)
    if (path) query.set('path', path)

    mailingCall<PageViewReport>(`/api/analytics/?${query}`)
      .then((report) => {
        if (stale) return
        setRead({ wanted, report })
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
  }, [period, bucket, path, wanted, onExpired])

  const report = read?.report
  const waiting = read?.wanted !== wanted && !problem
  const span = PERIODS[period].toLowerCase()

  const periodPicker = (
    <>
      <Select
        value={period}
        onChange={(event) => {
          setPeriod(event.target.value as ViewPeriod)
          setBucket(null)
        }}
        aria-label="Period"
        className="max-w-52"
      >
        {(Object.keys(PERIODS) as ViewPeriod[]).map((key) => (
          <option key={key} value={key}>
            {PERIODS[key]}
          </option>
        ))}
      </Select>
      <Span fontSize="text-xs" color="text-contrast-light" role="status" aria-live="polite">
        {waiting ? 'Reading…' : ''}
      </Span>
    </>
  )

  return (
    <div className="flex flex-col gap-4">
      {problem && (
        <Paragraph margin="mb-0" fontSize="text-xs" color="text-accent">
          {problem}
        </Paragraph>
      )}

      {!report && !problem && (
        <Paragraph margin="mb-0" fontSize="text-xs" color="text-contrast-light">
          Reading…
        </Paragraph>
      )}

      {report && (
        <>
          <BarChart
            buckets={report.buckets}
            unit={report.unit}
            selected={bucket}
            onSelect={setBucket}
            controls={periodPicker}
          />

          <Grid cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" gap="gap-2">
            <Tile
              icon={eye20Solid}
              label="Views"
              value={report.inPeriod.views}
              note={span}
              before={report.previous?.views}
            />
            <Tile
              icon={users20Solid}
              label="Visitors"
              value={report.inPeriod.visitors}
              note={span}
              before={report.previous?.visitors}
            />
            <Tile
              icon={calendarDays20Solid}
              label="Views today"
              value={report.today.views}
              note={plural(report.today.visitors, 'visitor')}
            />
            <Tile
              icon={globeAlt20Solid}
              label="Views, all time"
              value={report.allTime.views}
              note={plural(report.allTime.visitors, 'visitor')}
            />
            <Tile
              icon={trophy20Solid}
              label="Best day"
              value={report.bestDay?.views ?? 0}
              note={
                report.bestDay ? DateTime.fromISO(report.bestDay.day).toFormat('LLL d, yyyy') : ''
              }
            />
          </Grid>

          <div className={actionRowClass}>
            <Span fontSize="text-xs" color="text-contrast-light">
              {bucket
                ? `The lists below show ${bucketLabel(bucket, report.unit)} only.`
                : `Press a bar to see one ${report.unit} in the lists below.`}
            </Span>
            {bucket && (
              <button type="button" className={quietButtonClass} onClick={() => setBucket(null)}>
                Show the whole period
              </button>
            )}
            {onSeeVisits && (
              <button type="button" className={quietButtonClass} onClick={onSeeVisits}>
                See this post’s visits
              </button>
            )}
          </div>

          <Grid cols="grid-cols-1 lg:grid-cols-2" gap="gap-4">
            {!path && (
              <ViewList
                title="Most viewed"
                counted="Views"
                tabs={[
                  { name: 'Posts & pages', rows: report.pages, empty: 'Nothing was viewed.' },
                  {
                    name: 'Archives',
                    rows: report.archives,
                    empty: 'No category, tag, author or search page was viewed.',
                  },
                ]}
              />
            )}
            <ViewList
              title="Referrers"
              counted={path ? 'Views' : 'Visits'}
              tabs={[
                {
                  name: 'Came from',
                  rows: nameReferrers(report.referrers),
                  empty: 'Nobody arrived from another site.',
                },
              ]}
            />
            <ViewList
              title="Locations"
              counted="Views"
              tabs={[
                {
                  name: 'Countries',
                  rows: report.countries.map((row) => ({ ...row, label: countryName(row.key) })),
                  empty: 'No countries were recorded.',
                },
                { name: 'Regions', rows: report.regions, empty: 'No regions were recorded.' },
                { name: 'Cities', rows: report.cities, empty: 'No cities were recorded.' },
              ]}
            />
            <ViewList
              title="Campaigns"
              counted={path ? 'Views' : 'Visits'}
              tabs={[
                {
                  name: 'Source / medium / campaign',
                  rows: report.campaigns,
                  empty: 'Nobody arrived by a link tagged with a campaign.',
                },
              ]}
            />
            <ViewList
              title="Browsers and devices"
              counted="Views"
              tabs={[{ name: 'Browser', rows: report.devices, empty: 'Nothing was viewed.' }]}
            />
          </Grid>

          {report.logCutShort && (
            <Paragraph margin="mb-0" fontSize="text-xs" color="text-contrast-light">
              {path
                ? 'Every list here only goes back to when the site began logging its own views.'
                : 'Regions, cities, and browsers and devices only go back to when the site began logging its own views.'}
            </Paragraph>
          )}
        </>
      )}
    </div>
  )
}
