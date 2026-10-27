'use client'

import { useState } from 'react'
import checkBadge20Solid from '@iconify/icons-heroicons/check-badge-20-solid'
import envelope20Solid from '@iconify/icons-heroicons/envelope-20-solid'
import paperAirplane20Solid from '@iconify/icons-heroicons/paper-airplane-20-solid'
import presentationChartLine20Solid from '@iconify/icons-heroicons/presentation-chart-line-20-solid'
import userPlus20Solid from '@iconify/icons-heroicons/user-plus-20-solid'
import { PERIODS, Tile } from '@/components/analytics/overview-tab'
import { countryName } from '@/components/analytics/places'
import { nameReferrers } from '@/components/analytics/referrers'
import { ViewList } from '@/components/analytics/view-list'
import { Grid } from '@/components/grid'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import { Select, plural, quietButtonClass } from '@/components/mailing/parts'
import { useFlowTraceRead } from '@/hooks/use-flow-trace'
import type { FtOverview } from '@/utils/flow-trace-types'
import type { ViewPeriod } from '@/utils/page-view-types'
import { VisitTable } from './visit-table'

// The share of the site's visits that converted, as "2.5%".
function rate(converted: number, visits: number | null): string {
  if (!visits) return '—'
  const share = (converted / visits) * 100
  return `${share < 10 ? share.toFixed(1) : Math.round(share)}%`
}

interface OverviewTabProps {
  onOpenVisit: (id: string) => void
  onSeeAll: () => void
  onExpired: () => void
  refreshed: number
}

// FlowTrace's numbers for a period, in the analytics' own period picker,
// tiles and lists: the visits that converted and each kind of conversion
// against the period before, measured against the site's visits as
// Analytics counts them, then the converted visits themselves and where
// they came from, were and read.
export function OverviewTab({
  onOpenVisit,
  onSeeAll,
  onExpired,
  refreshed,
}: OverviewTabProps) {
  const [period, setPeriod] = useState<ViewPeriod>('30d')
  const read = useFlowTraceRead<FtOverview>(
    `/api/flowtrace/summary/?period=${period}`,
    onExpired,
    refreshed
  )
  const summary = read.value?.summary
  const before = read.value?.before
  const span = PERIODS[period].toLowerCase()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={period}
          onChange={(event) => setPeriod(event.target.value as ViewPeriod)}
          aria-label="Period"
          className="max-w-52"
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
        <Span
          fontSize="text-xs"
          color="text-contrast-light"
          role="status"
          aria-live="polite"
        >
          {read.waiting ? 'Reading…' : ''}
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

      {!summary && !read.problem && (
        <Paragraph
          margin="mb-0"
          fontSize="text-xs"
          color="text-contrast-light"
        >
          Reading…
        </Paragraph>
      )}

      {summary && (
        <>
          <Paragraph
            margin="mb-0"
            fontSize="text-xs"
            color="text-contrast-light"
          >
            {plural(summary.converted, 'converted visit')} ·{' '}
            {plural(summary.visits ?? 0, 'visit')} ·{' '}
            {rate(summary.converted, summary.visits)} converted, {span}
          </Paragraph>

          <Grid
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            gap="gap-2"
          >
            <Tile
              icon={checkBadge20Solid}
              label="Converted visits"
              value={summary.converted}
              note={span}
              before={before?.converted}
            />
            <Tile
              icon={presentationChartLine20Solid}
              label="Site visits"
              value={summary.visits ?? 0}
              note={`${rate(summary.converted, summary.visits)} converted · Analytics`}
              before={before?.visits ?? undefined}
            />
            <Tile
              icon={paperAirplane20Solid}
              label="Contact forms"
              value={summary.conversions.form}
              note={span}
              before={before?.conversions.form}
            />
            <Tile
              icon={envelope20Solid}
              label="Newsletter sign-ups"
              value={summary.conversions.newsletter}
              note={span}
              before={before?.conversions.newsletter}
            />
            <Tile
              icon={userPlus20Solid}
              label="Accounts created"
              value={summary.conversions.signup}
              note={`${plural(summary.conversions.email + summary.conversions.call, 'email or phone link')}`}
              before={before?.conversions.signup}
            />
          </Grid>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Heading
                as="h4"
                color="text-contrast"
                fontSize="text-base"
                margin="mb-0"
                disableId
              >
                Converted visits
              </Heading>
              <button
                type="button"
                className={quietButtonClass}
                onClick={onSeeAll}
              >
                See them all
              </button>
            </div>
            <VisitTable
              visits={summary.convertedVisits}
              onOpen={onOpenVisit}
              empty="No visit converted in this period yet."
            />
          </section>

          <Grid
            cols="grid-cols-1 lg:grid-cols-2"
            gap="gap-4"
          >
            <ViewList
              title="Where they came from"
              counted="Visits"
              tabs={[
                {
                  name: 'Came from',
                  rows: nameReferrers(summary.sources),
                  empty: 'No converted visits in this period.',
                },
              ]}
            />
            <ViewList
              title="Locations"
              counted="Visits"
              tabs={[
                {
                  name: 'Countries',
                  rows: summary.countries.map((row) => ({
                    ...row,
                    label: countryName(row.key),
                  })),
                  empty: 'No countries were recorded.',
                },
                {
                  name: 'Regions',
                  rows: summary.regions,
                  empty: 'No regions were recorded.',
                },
                {
                  name: 'Cities',
                  rows: summary.cities,
                  empty: 'No cities were recorded.',
                },
              ]}
            />
            <ViewList
              title="Pages they read"
              counted="Views"
              tabs={[
                {
                  name: 'Pages',
                  rows: summary.pages,
                  empty: 'No converted visits in this period.',
                },
              ]}
            />
            <ViewList
              title="Browsers and devices"
              counted="Visits"
              tabs={[
                {
                  name: 'Browser',
                  rows: summary.devices,
                  empty: 'No converted visits in this period.',
                },
              ]}
            />
          </Grid>
        </>
      )}
    </div>
  )
}
