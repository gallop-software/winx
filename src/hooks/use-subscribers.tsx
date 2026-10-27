'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MailingSessionExpired, mailingCall } from '@/hooks/use-mailing'
import type {
  SubscriberCounts,
  SubscriberRow,
  SubscriberSort,
  SubscriberStatusFilter,
} from '@/utils/mailing-types'

export type SubscriberQueryState = {
  status: SubscriberStatusFilter
  search: string
  sort: SubscriberSort
  descending: boolean
  page: number
}

type ListAnswer = {
  rows: SubscriberRow[]
  total: number
  counts: SubscriberCounts
  perPage: number
}

export const EMPTY_COUNTS: SubscriberCounts = {
  all: 0,
  subscribed: 0,
  pending: 0,
  unsubscribed: 0,
  bounced: 0,
  complained: 0,
}

// One page of the mailing list, read again whenever the filter, the sort or
// the page changes. Typing in the search box is waited on for a moment, so
// the list is not asked for at every letter.
export function useSubscriberList(query: SubscriberQueryState) {
  const [rows, setRows] = useState<SubscriberRow[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<SubscriberCounts>(EMPTY_COUNTS)
  const [perPage, setPerPage] = useState(50)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const run = useRef(0)

  const { status, search, sort, descending, page } = query

  const load = useCallback(async () => {
    const mine = ++run.current
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        status,
        search,
        sort,
        dir: descending ? 'desc' : 'asc',
        page: String(page),
      })
      const result = await mailingCall<ListAnswer>(`/api/mailing/subscribers/?${params}`)
      if (run.current !== mine) return
      setRows(result.rows)
      setTotal(result.total)
      setCounts(result.counts)
      setPerPage(result.perPage)
    } catch (caught) {
      if (run.current !== mine) return
      if (caught instanceof MailingSessionExpired) setExpired(true)
      else setError((caught as Error).message || 'The list could not be read.')
    } finally {
      if (run.current === mine) setLoading(false)
    }
  }, [status, search, sort, descending, page])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  return { rows, total, counts, perPage, loading, error, expired, reload: load }
}

// Which rows an action is for: the ones ticked, or everyone matching the
// filter on screen.
export type SubscriberSelection =
  | { ids: number[] }
  | { query: { status: SubscriberStatusFilter; search: string } }

export type SubscriberAction = 'unsubscribe' | 'resubscribe' | 'delete' | 'resend'

// An action on many subscribers. Resending confirmations goes a few at a
// time, so it is asked for again until none are left.
export async function actOnSubscribers(
  action: SubscriberAction,
  selection: SubscriberSelection,
  options: { consent?: boolean; includeComplaints?: boolean } = {}
): Promise<number> {
  let changed = 0
  for (;;) {
    const result = await mailingCall<{ changed: number; more?: boolean }>(
      '/api/mailing/subscribers/',
      { body: { action, selection, ...options } }
    )
    changed += result.changed
    if (action !== 'resend' || !result.more) return changed
  }
}
