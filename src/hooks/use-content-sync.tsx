'use client'

import { useCallback, useRef, useState } from 'react'

export type SyncPhase =
  | 'idle'
  | 'working'
  // The rebuild would remove many posts and waits for confirmRemoval().
  | 'confirm'
  | 'done'
  | 'error'
  // The server no longer recognizes the login.
  | 'expired'

export type SyncProgress = {
  label: string
  // From 0 to 1.
  fraction: number
}

class SessionExpired extends Error {}
class Cancelled extends Error {}

const BUSY_RETRIES = 5
const REBUILD_KINDS = [
  { kind: 'category', label: 'categories' },
  { kind: 'post_tag', label: 'tags' },
  { kind: 'author', label: 'authors' },
] as const

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function plural(count: number, word: string) {
  return `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`
}

// One call to /api/sync. WordPress refusing because it is busy is waited out
// and tried again. So is a first 401: the login check asks WordPress too, and
// fails the same way when WordPress is busy.
async function call(body: Record<string, unknown>): Promise<any> {
  let refused = false

  for (let attempt = 0; ; attempt++) {
    const response = await fetch('/api/sync/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await response.json().catch(() => ({}))
    if (response.ok) return json

    if (response.status === 401) {
      if (refused) throw new SessionExpired()
      refused = true
      await wait(3000)
      continue
    }

    const busy = response.status === 503 || response.status === 429
    if (busy && attempt < BUSY_RETRIES) {
      await wait(Math.min(Number(json?.retryAfter) || 5, 30) * 1000)
      continue
    }

    throw new Error(
      busy
        ? 'WordPress is busy. Try again in a minute.'
        : json?.message || `The server answered ${response.status}.`
    )
  }
}

// Runs Sync and Rebuild against /api/sync, one call after another, and
// reports how far along they are.
export function useContentSync() {
  const [phase, setPhase] = useState<SyncPhase>('idle')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  // Whether anything in the index changed, so the page should be loaded again.
  const [changed, setChanged] = useState(false)
  const cancelled = useRef(false)
  const pendingRun = useRef<number | null>(null)

  const begin = (label: string) => {
    cancelled.current = false
    pendingRun.current = null
    setChanged(false)
    setMessage('')
    setProgress({ label, fraction: 0 })
    setPhase('working')
  }

  const fail = (error: unknown) => {
    setProgress(null)
    if (error instanceof SessionExpired) {
      setMessage('Session expired. Log in again.')
      setPhase('expired')
    } else if (error instanceof Cancelled) {
      setMessage('Rebuild cancelled. Nothing was removed.')
      setPhase('done')
    } else {
      setMessage((error as Error).message || 'Something went wrong.')
      setPhase('error')
    }
  }

  const finish = useCallback(async (runId: number, force: boolean) => {
    setProgress({ label: 'Finishing', fraction: 1 })
    const result = await call({ action: 'rebuild-finish', runId, force })
    setProgress(null)

    if (result.finished) {
      setChanged(true)
      setMessage(
        `Rebuilt the index: ${plural(result.posts, 'post')}` +
          (result.removed
            ? `, ${plural(result.removed, 'post')} removed.`
            : '.')
      )
      setPhase('done')
      return
    }

    if (result.reason === 'confirm') {
      pendingRun.current = runId
      setMessage(
        `${plural(result.stale, 'post')} in the index ${
          result.stale === 1 ? 'is' : 'are'
        } no longer in WordPress and would be removed. Remove them?`
      )
      setPhase('confirm')
      return
    }

    // Everything read has been kept; only the removal was skipped.
    setChanged(true)
    setMessage(
      `WordPress changed while it was being read (${result.seen.toLocaleString()} of ${result.wpTotal.toLocaleString()} posts read), so nothing was removed. Run Rebuild again.`
    )
    setPhase('error')
  }, [])

  const runSync = useCallback(async () => {
    begin('Checking WordPress')
    try {
      const updated: { title: string; url: string }[] = []
      let cursor: unknown = null
      let result: any

      do {
        result = await call({ action: 'sync', cursor })
        if (result.needsRebuild) {
          setProgress(null)
          setMessage('The index is empty. Run Rebuild to fill it.')
          setPhase('error')
          return
        }
        updated.push(...result.updated)
        cursor = result.cursor
        setProgress({
          label: `${plural(updated.length, 'post')} synced`,
          fraction: 0,
        })
      } while (!result.done)

      const extra =
        typeof result.wpTotal === 'number'
          ? result.indexTotal - result.wpTotal
          : 0

      setProgress(null)
      setChanged(updated.length > 0)
      setMessage(
        (updated.length === 0
          ? 'Nothing new in WordPress.'
          : updated.length === 1
            ? `Synced “${updated[0]?.title}”.`
            : `Synced ${plural(updated.length, 'post')}.`) +
          (extra > 0
            ? ` ${plural(extra, 'post')} in the index ${
                extra === 1 ? 'is' : 'are'
              } no longer in WordPress. Run Rebuild to remove ${
                extra === 1 ? 'it' : 'them'
              }.`
            : '')
      )
      setPhase('done')
    } catch (error) {
      fail(error)
    }
  }, [])

  const runRebuild = useCallback(async () => {
    begin('Starting')
    try {
      const start = await call({ action: 'rebuild-start' })
      const runId: number = start.runId
      let totalPages: number = start.totalPages

      // Term and comment pages are not known until the first of each
      // answers, so posts are counted as eight tenths of the work.
      for (let page = 1; page <= totalPages; page++) {
        if (cancelled.current) throw new Cancelled()
        const result = await call({ action: 'rebuild-page', runId, page })
        if (result.totalPages) totalPages = result.totalPages
        setChanged(true)
        setProgress({
          label: `Posts: page ${page} of ${totalPages} (${Math.min(
            page * start.perPage,
            start.total
          ).toLocaleString()} of ${start.total.toLocaleString()})`,
          fraction: (page / totalPages) * 0.8,
        })
      }

      for (const [index, { kind, label }] of REBUILD_KINDS.entries()) {
        let pages = 1
        for (let page = 1; page <= pages; page++) {
          if (cancelled.current) throw new Cancelled()
          const result = await call({
            action: 'rebuild-terms',
            runId,
            kind,
            page,
          })
          pages = result.totalPages || pages
          setProgress({
            label:
              pages > 1
                ? `Reading ${label}: page ${page} of ${pages}`
                : `Reading ${label}`,
            fraction:
              0.8 + ((index + page / pages) / REBUILD_KINDS.length) * 0.1,
          })
        }
      }

      if (cancelled.current) throw new Cancelled()
      setProgress({ label: 'Reading pages', fraction: 0.9 })
      await call({ action: 'rebuild-pages' })

      let pages = 1
      for (let page = 1; page <= pages; page++) {
        if (cancelled.current) throw new Cancelled()
        const result = await call({ action: 'rebuild-counts', page })
        pages = result.totalPages || pages
        setProgress({
          label:
            pages > 1
              ? `Counting comments: page ${page} of ${pages}`
              : 'Counting comments',
          fraction: 0.9 + (page / pages) * 0.1,
        })
      }

      if (cancelled.current) throw new Cancelled()
      await finish(runId, false)
    } catch (error) {
      fail(error)
    }
  }, [finish])

  // Goes ahead with the removal a rebuild stopped to ask about.
  const confirmRemoval = useCallback(async () => {
    const runId = pendingRun.current
    if (runId === null) return
    pendingRun.current = null
    setPhase('working')
    try {
      await finish(runId, true)
    } catch (error) {
      fail(error)
    }
  }, [finish])

  // Stops a rebuild after the call in flight. Nothing is removed from the
  // index until a rebuild finishes, so stopping is always safe.
  const cancel = useCallback(() => {
    cancelled.current = true
  }, [])

  const reset = useCallback(() => {
    pendingRun.current = null
    setPhase('idle')
    setMessage('')
    setProgress(null)
  }, [])

  return {
    phase,
    message,
    progress,
    changed,
    runSync,
    runRebuild,
    confirmRemoval,
    cancel,
    reset,
  }
}
