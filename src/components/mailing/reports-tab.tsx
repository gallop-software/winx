'use client'

import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import chevronDown20Solid from '@iconify/icons-heroicons/chevron-down-20-solid'
import chevronUp20Solid from '@iconify/icons-heroicons/chevron-up-20-solid'
import { Grid } from '@/components/grid'
import { Icon } from '@/components/icon'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import { MailingSessionExpired, mailingCall } from '@/hooks/use-mailing'
import type {
  Campaign,
  RecipientFilter,
  RecipientRow,
  RecipientSort,
} from '@/utils/mailing-types'
import {
  actionRowClass,
  Badge,
  cellClass,
  formatTime,
  inputClass,
  mainButtonClass,
  Pager,
  plural,
  quietButtonClass,
  Select,
  StatTile,
  tableClass,
  tableScrollClass,
} from './parts'

const STATUS_LABELS: Record<Campaign['status'], string> = {
  draft: 'Not sent',
  sending: 'Sending',
  paused: 'Paused',
  sent: 'Sent',
}

const FILTER_LABELS: Record<RecipientFilter, string> = {
  all: 'Everyone',
  delivered: 'Delivered',
  opened: 'Opened',
  clicked: 'Clicked',
  unopened: 'Not opened',
  bounced: 'Bounced',
  unsubscribed: 'Unsubscribed',
  complained: 'Marked as spam',
  failed: 'Not sent',
  skipped: 'Skipped',
  queued: 'Waiting',
}

const SKIP_REASONS: Record<string, string> = {
  unsubscribe: 'Unsubscribed',
  hard_bounce: 'Address bounced before',
  complaint: 'Marked a message as spam',
}

// What became of one person's email, the most telling thing first.
function outcome(row: RecipientRow): { label: string; tone: 'plain' | 'good' | 'strong' | 'warn' } {
  if (row.complainedAt) return { label: 'Marked as spam', tone: 'warn' }
  if (row.unsubscribedAt) return { label: 'Unsubscribed', tone: 'warn' }
  if (row.bouncedAt) {
    return { label: row.bounceType === 'soft' ? 'Bounced (temporary)' : 'Bounced', tone: 'warn' }
  }
  if (row.status === 'skipped') return { label: 'Skipped', tone: 'plain' }
  if (row.status === 'failed') return { label: 'Not sent', tone: 'warn' }
  if (row.status === 'sending') return { label: 'Unconfirmed', tone: 'warn' }
  if (row.status === 'queued') return { label: 'Waiting', tone: 'plain' }
  if (row.clicks) return { label: 'Clicked', tone: 'strong' }
  if (row.opens) return { label: 'Opened', tone: 'good' }
  if (row.deliveredAt) return { label: 'Delivered', tone: 'plain' }
  return { label: 'Sent', tone: 'plain' }
}

type Report = {
  campaign: Campaign
  rows: RecipientRow[]
  total: number
  perPage: number
}

interface ReportsTabProps {
  postId: number
  // The campaign to open first, such as the one just sent.
  initialCampaignId: number | null
  // A campaign that is being sent right now, shown as it changes.
  live: Campaign | null
  sending: boolean
  onResume: (campaign: Campaign) => void
  onExpired: () => void
}

// How each campaign for this post did: its totals, and every person it went
// to with what they did with it.
export function ReportsTab({
  postId,
  initialCampaignId,
  live,
  sending,
  onResume,
  onExpired,
}: ReportsTabProps) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [openId, setOpenId] = useState<number | null>(initialCampaignId)
  const [report, setReport] = useState<Report | null>(null)
  const [filter, setFilter] = useState<RecipientFilter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<RecipientSort>('activity')
  const [descending, setDescending] = useState(true)
  const [page, setPage] = useState(1)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  const fail = useCallback(
    (error: unknown) => {
      if (error instanceof MailingSessionExpired) onExpired()
      else setProblem((error as Error).message || 'The report could not be read.')
    },
    [onExpired]
  )

  const loadCampaigns = useCallback(async () => {
    try {
      const result = await mailingCall<{ campaigns: Campaign[] }>(
        `/api/mailing/campaigns/?postId=${postId}`
      )
      setCampaigns(result.campaigns)
      setOpenId((current) => current ?? result.campaigns[0]?.id ?? null)
    } catch (error) {
      fail(error)
    }
  }, [postId, fail])

  const loadReport = useCallback(async () => {
    if (!openId) return
    setBusy(true)
    setProblem('')
    try {
      const query = new URLSearchParams({
        filter,
        search,
        sort,
        dir: descending ? 'desc' : 'asc',
        page: String(page),
      })
      setReport(await mailingCall<Report>(`/api/mailing/campaigns/${openId}/?${query}`))
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }, [openId, filter, search, sort, descending, page, fail])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  // The search box is waited on for a moment, so the report is not asked
  // for at every letter.
  useEffect(() => {
    const timer = setTimeout(loadReport, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [loadReport, search])

  const open = (id: number) => {
    setOpenId(id)
    setReport(null)
    setFilter('all')
    setSearch('')
    setPage(1)
  }

  const refresh = () => {
    loadCampaigns()
    loadReport()
  }

  const requeue = async (action: 'retry-failed' | 'retry-unconfirmed') => {
    if (!openId) return
    try {
      await mailingCall(`/api/mailing/campaigns/${openId}/send/`, { body: { action } })
      refresh()
    } catch (error) {
      fail(error)
    }
  }

  const remove = async () => {
    if (!openId) return
    try {
      await mailingCall(`/api/mailing/campaigns/${openId}/`, { method: 'DELETE' })
      setOpenId(null)
      setReport(null)
      setCampaigns(null)
      loadCampaigns()
    } catch (error) {
      fail(error)
    }
  }

  const sortBy = (column: RecipientSort) => {
    if (sort === column) setDescending(!descending)
    else {
      setSort(column)
      setDescending(column !== 'name' && column !== 'email')
    }
    setPage(1)
  }

  const pick = (next: RecipientFilter) => {
    setFilter(next)
    setPage(1)
  }

  if (campaigns === null) {
    return (
      <Paragraph margin="mb-0" fontSize="text-xs" color={problem ? 'text-accent' : 'text-contrast-light'}>
        {problem || 'Reading campaigns…'}
      </Paragraph>
    )
  }

  if (!campaigns.length) {
    return (
      <Paragraph margin="mb-0" fontSize="text-xs" color="text-contrast-light">
        This post has not been sent as an email yet. Choose who it goes to under Recipients,
        then send it under Send.
      </Paragraph>
    )
  }

  // The campaign being sent right now is fresher than what was last read.
  const campaign =
    (live && live.id === openId ? live : null) ??
    report?.campaign ??
    campaigns.find((item) => item.id === openId) ??
    null
  const totals = campaign?.totals
  const pages = report ? Math.max(1, Math.ceil(report.total / report.perPage)) : 1
  const waiting = totals ? totals.queued : 0

  const heading = (column: RecipientSort, label: string) => (
    <th scope="col" className={cellClass} aria-sort={sort === column ? (descending ? 'descending' : 'ascending') : 'none'}>
      <button
        type="button"
        onClick={() => sortBy(column)}
        className="inline-flex items-center gap-1 cursor-pointer font-semibold"
      >
        {label}
        {sort === column && (
          <Icon className="w-4 h-4" icon={descending ? chevronDown20Solid : chevronUp20Solid} />
        )}
      </button>
    </th>
  )

  return (
    <div className="flex flex-col gap-3 sm:h-full">
      <div className={actionRowClass}>
        <Select
          value={openId ?? ''}
          onChange={(event) => open(Number(event.target.value))}
          aria-label="Campaign"
          className="sm:max-w-md"
        >
          {campaigns.map((item) => (
            <option key={item.id} value={item.id}>
              {formatTime(item.startedAt ?? item.createdAt)} · {STATUS_LABELS[item.status]} ·{' '}
              {item.subject}
            </option>
          ))}
        </Select>
        <button type="button" className={quietButtonClass} onClick={refresh} disabled={busy}>
          Refresh
        </button>
        {campaign && campaign.status !== 'sent' && waiting > 0 && !sending && (
          <button type="button" className={mainButtonClass} onClick={() => onResume(campaign)}>
            {campaign.status === 'draft' ? 'Send' : 'Resume'} ({plural(waiting, 'person')} waiting)
          </button>
        )}
        {campaign?.status === 'draft' && !sending && (
          <button type="button" className={quietButtonClass} onClick={remove}>
            Delete
          </button>
        )}
      </div>

      {campaign && totals && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={campaign.status === 'sent' ? 'good' : 'plain'}>
              {STATUS_LABELS[campaign.status]}
            </Badge>
            <Span fontSize="text-xs" color="text-contrast-light">
              {plural(totals.recipients, 'recipient')}
              {campaign.finishedAt ? ` · finished ${formatTime(campaign.finishedAt)}` : ''}
              {campaign.status === 'paused' && campaign.pauseReason ? ` · ${campaign.pauseReason}` : ''}
            </Span>
          </div>

          <Grid cols="grid-cols-2 sm:grid-cols-4 lg:grid-cols-7" gap="gap-2">
            <StatTile label="Sent" value={totals.sent} of={totals.recipients} active={filter === 'all'} onClick={() => pick('all')} />
            <StatTile label="Delivered" value={totals.delivered} of={totals.sent} active={filter === 'delivered'} onClick={() => pick('delivered')} />
            <StatTile label="Opened" value={totals.opened} of={totals.sent} active={filter === 'opened'} onClick={() => pick('opened')} />
            <StatTile label="Clicked" value={totals.clicked} of={totals.sent} active={filter === 'clicked'} onClick={() => pick('clicked')} />
            <StatTile label="Bounced" value={totals.bounced} of={totals.sent} active={filter === 'bounced'} onClick={() => pick('bounced')} />
            <StatTile label="Unsubscribed" value={totals.unsubscribed} of={totals.sent} active={filter === 'unsubscribed'} onClick={() => pick('unsubscribed')} />
            <StatTile label="Spam reports" value={totals.complained} of={totals.sent} active={filter === 'complained'} onClick={() => pick('complained')} />
          </Grid>

          {(totals.failed > 0 || totals.unconfirmed > 0) && !sending && (
            <div className={clsx(actionRowClass, 'rounded-md bg-accent/5 px-3 py-2')}>
              <Span fontSize="text-xs">
                {totals.failed > 0 && `${plural(totals.failed, 'email')} could not be sent. `}
                {totals.unconfirmed > 0 &&
                  `${plural(totals.unconfirmed, 'email')} may or may not have gone out: sending was cut off. Trying again could send those a second time.`}
              </Span>
              {totals.failed > 0 && (
                <button type="button" className={quietButtonClass} onClick={() => requeue('retry-failed')}>
                  Try the failed ones again
                </button>
              )}
              {totals.unconfirmed > 0 && (
                <button type="button" className={quietButtonClass} onClick={() => requeue('retry-unconfirmed')}>
                  Send the unconfirmed ones again
                </button>
              )}
            </div>
          )}
        </>
      )}

      <div className={actionRowClass}>
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Filter by name or email"
          aria-label="Filter by name or email"
          className={clsx(inputClass, 'sm:max-w-xs')}
        />
        <Select
          value={filter}
          onChange={(event) => pick(event.target.value as RecipientFilter)}
          aria-label="Show"
          className="sm:max-w-48"
        >
          {(Object.keys(FILTER_LABELS) as RecipientFilter[]).map((key) => (
            <option key={key} value={key}>
              {FILTER_LABELS[key]}
            </option>
          ))}
        </Select>
        <Span fontSize="text-xs" color="text-contrast-light" role="status" aria-live="polite">
          {report ? plural(report.total, 'person') : 'Reading…'}
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
              {heading('name', 'Name')}
              {heading('email', 'Email')}
              {heading('status', 'Outcome')}
              {heading('opens', 'Opens')}
              {heading('clicks', 'Clicks')}
              <th scope="col" className={cellClass}>Delivered</th>
              {heading('activity', 'Last activity')}
            </tr>
          </thead>
          <tbody className="divide-y divide-contrast/10">
            {report?.rows.map((row) => {
              const result = outcome(row)
              return (
                <tr
                  key={row.id}
                  className={clsx(row.clicks ? 'bg-accent/10' : row.opens ? 'bg-accent/5' : '')}
                >
                  <td className={cellClass}>{row.name || '—'}</td>
                  <td className={cellClass}>{row.email}</td>
                  <td className={cellClass}>
                    <Badge tone={result.tone}>{result.label}</Badge>
                    {row.error && (
                      <Span fontSize="text-xs" color="text-contrast-light" className="ml-2">
                        {SKIP_REASONS[row.error] ?? row.error}
                      </Span>
                    )}
                  </td>
                  <td className={cellClass}>{row.opens || '—'}</td>
                  <td className={cellClass}>{row.clicks || '—'}</td>
                  <td className={cellClass}>{row.deliveredAt ? 'Yes' : '—'}</td>
                  <td className={clsx(cellClass, 'whitespace-nowrap')}>{formatTime(row.lastEventAt)}</td>
                </tr>
              )
            })}
            {report && !report.rows.length && (
              <tr>
                <td colSpan={7} className={clsx(cellClass, 'py-8 text-center text-contrast-light')}>
                  Nobody matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Span fontSize="text-xs" color="text-contrast-light">
          Opens are approximate: some mail programs load pictures before the reader looks, and
          some never load them. Delivery and bounces arrive from Cloudflare a little after sending.
        </Span>
        <Pager page={Math.min(page, pages)} pages={pages} onPage={setPage} />
      </div>
    </div>
  )
}
