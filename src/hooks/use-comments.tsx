'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DateTime } from 'luxon'
import { state } from '@/state'
import { addPending, readPending } from '@/utils/comment-storage'
import type {
  CommentsResponse,
  PostCommentResponse,
  SiteComment,
} from '@/utils/comment-types'

export type CommentsStatus = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

export type CommentsSettings = {
  open: boolean
  canComment: boolean
  membersOnly: boolean
  threadDepth: number
  requireNameEmail: boolean
}

type Posted = Extract<PostCommentResponse, { ok: true }>

// How often to look for new comments. The server answers from the copy it
// keeps, so asking never reaches WordPress.
const POLL_MS = 60 * 1000
const POLL_QUIET_MS = 2 * 60 * 1000
const POLL_IDLE_MS = 5 * 60 * 1000
const QUIET_AFTER_MS = 10 * 60 * 1000
const IDLE_AFTER_MS = 30 * 60 * 1000

// The server said its copy was being brought up to date: ask once more.
const FOLLOW_UP_MS = 5 * 1000

// A comment the visitor has just posted is shown whether or not the server's
// list has it yet. The list is kept in many places, and they take up to a
// minute to agree.
const OWN_KEPT_MS = 5 * 60 * 1000

// A token is good for two hours. Taking a newer one after one leaves room.
const TOKEN_REPLACE_AFTER_MS = 60 * 60 * 1000

const now = () => DateTime.now().toMillis()

const inOrder = (a: SiteComment, b: SiteComment) =>
  a.dateGmt.localeCompare(b.dateGmt) || a.id - b.id

// Loads a post's comments, keeps them up to date while the visitor is
// looking at them, and holds the token the comment form sends back.
export function useComments(
  postId: number,
  options: {
    // Nothing is loaded until this is true.
    enabled: boolean
    // Whether the comments are on screen. Nothing is asked for while they
    // are not.
    watching: boolean
    // Called before a change to the list is shown, for the caller to note
    // where the visitor is reading.
    onBeforeChange?: () => void
  }
) {
  const { enabled, watching, onBeforeChange } = options

  const [status, setStatus] = useState<CommentsStatus>('idle')
  const [settings, setSettings] = useState<CommentsSettings | null>(null)
  const [served, setServed] = useState<SiteComment[]>([])
  const [count, setCount] = useState(0)
  const [own, setOwn] = useState<{ comment: SiteComment; at: number }[]>([])
  const [pending, setPending] = useState<SiteComment[]>([])
  const [announcement, setAnnouncement] = useState('')

  const version = useRef('')
  const token = useRef<{ value: string; at: number } | null>(null)
  const lastFetch = useRef(0)
  const lastChange = useRef(0)
  const loading = useRef(false)
  const known = useRef<Set<number>>(new Set())
  const beforeChange = useRef(onBeforeChange)
  beforeChange.current = onBeforeChange

  const takeToken = useCallback((value: string | null | undefined, force = false) => {
    if (!value) return
    const current = token.current
    if (!force && current && now() - current.at < TOKEN_REPLACE_AFTER_MS) return
    token.current = { value, at: now() }
  }, [])

  const load = useCallback(
    async (poll: boolean): Promise<boolean> => {
      if (loading.current) return false
      loading.current = true

      try {
        const params = new URLSearchParams({ post: String(postId) })
        if (poll) {
          params.set('poll', '1')
          if (version.current) params.set('v', version.current)
        }

        const response = await fetch(`/api/comments/?${params}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = (await response.json()) as CommentsResponse

        lastFetch.current = now()

        if (!data.available) {
          setStatus('unavailable')
          return false
        }

        takeToken(data.token)

        if (data.unchanged) return false

        const first = version.current === ''
        const arrived = data.comments.filter((c) => !known.current.has(c.id))

        if (!first) beforeChange.current?.()

        version.current = data.version
        lastChange.current = now()
        known.current = new Set(data.comments.map((c) => c.id))

        setSettings({
          open: data.open,
          canComment: data.canComment,
          membersOnly: data.membersOnly === true,
          threadDepth: data.threadDepth,
          requireNameEmail: data.requireNameEmail,
        })
        setServed(data.comments)
        setCount(data.count)
        setPending(readPending(postId, known.current))
        setStatus('ready')

        if (!first && arrived.length) {
          const names = [...new Set(arrived.map((c) => c.authorName))]
          setAnnouncement(
            arrived.length === 1
              ? `New comment from ${names[0]}`
              : `${arrived.length} new comments`
          )
        }

        return data.stale
      } finally {
        loading.current = false
      }
    },
    [postId, takeToken]
  )

  // The first load.
  const start = useCallback(() => {
    setStatus('loading')
    load(false)
      .then((stale) => {
        if (stale) window.setTimeout(() => load(true).catch(() => {}), FOLLOW_UP_MS)
      })
      .catch(() => setStatus('error'))
  }, [load])

  useEffect(() => {
    if (enabled && status === 'idle') start()
  }, [enabled, status, start])

  // Looking for new comments, while the visitor is looking at these.
  useEffect(() => {
    if (status !== 'ready' || !watching) return

    let timer = 0
    let stopped = false

    const interval = () => {
      const quiet = now() - lastChange.current
      if (quiet > IDLE_AFTER_MS) return POLL_IDLE_MS
      return quiet > QUIET_AFTER_MS ? POLL_QUIET_MS : POLL_MS
    }

    const schedule = (delay: number) => {
      window.clearTimeout(timer)
      if (!stopped) timer = window.setTimeout(tick, delay)
    }

    const tick = async () => {
      if (stopped) return
      if (document.visibilityState !== 'visible') return
      try {
        const stale = await load(true)
        schedule(stale ? FOLLOW_UP_MS : interval())
      } catch {
        // The site or the connection is down. Try again at the usual time.
        schedule(interval())
      }
    }

    const resume = () => {
      if (document.visibilityState !== 'visible') {
        window.clearTimeout(timer)
        return
      }
      const due = lastFetch.current + interval() - now()
      schedule(Math.max(0, due))
    }

    resume()
    document.addEventListener('visibilitychange', resume)

    return () => {
      stopped = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [status, watching, load])

  // A comment the visitor has just posted.
  const add = useCallback(
    (posted: Posted) => {
      takeToken(posted.token, true)
      lastChange.current = now()

      if (posted.status === 'approved') {
        setOwn((list) => [...list, { comment: posted.comment, at: now() }])
        setCount((current) => Math.max(current + 1, posted.count))
      } else {
        addPending(postId, posted.comment)
        setPending(readPending(postId, known.current))
      }
    },
    [postId, takeToken]
  )

  // The server's list, with the visitor's own comments it does not have.
  const comments = useMemo(() => {
    const ids = new Set(served.map((c) => c.id))
    const cutoff = now() - OWN_KEPT_MS
    const merged = [...served]

    for (const { comment, at } of own) {
      if (at > cutoff && !ids.has(comment.id)) {
        ids.add(comment.id)
        merged.push(comment)
      }
    }
    for (const comment of pending) {
      if (!ids.has(comment.id)) {
        ids.add(comment.id)
        merged.push({ ...comment, status: 'pending' })
      }
    }

    return merged.sort(inOrder)
  }, [served, own, pending])

  // Approved comments only: what everyone can see.
  const shown = Math.max(
    count,
    comments.filter((c) => c.status === 'approved').length
  )

  // The post's toolbars show the same number as the heading.
  useEffect(() => {
    if (status === 'ready') state.commentCounts[postId] = shown
  }, [status, postId, shown])

  return {
    status,
    settings,
    comments,
    count: shown,
    announcement,
    // The token for the form to send, and when it arrived.
    getToken: useCallback(() => token.current, []),
    setToken: useCallback(
      (value: string | null | undefined) => takeToken(value, true),
      [takeToken]
    ),
    add,
    retry: start,
  }
}
