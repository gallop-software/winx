'use client'

import { useCallback, useEffect } from 'react'
import { DateTime } from 'luxon'
import { state, useSnapshot } from '@/state'

// The admin toolbar's demo, for a visitor who is not an administrator. It
// is remembered in this browser only, and changes nothing on the server:
// every number and list the toolbar shows while it is on is made up in the
// browser (src/utils/demo-api.ts), and the one thing it can really do is
// email a post, once, through /api/demo/email.

// Off unless the site turns it on: a site built from this template shows
// its readers nothing of the demo, not even the button. Only the template's
// own showcase sets NEXT_PUBLIC_ADMIN_DEMO=true.
export const DEMO_ENABLED = process.env.NEXT_PUBLIC_ADMIN_DEMO === 'true'

const KEY = 'winx-admin-demo'
// The one email a day the demo allows, once sent, so the button can say so
// before the server does.
const SENT_KEY = 'winx-admin-demo-sent'

let read = false

function remember(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Private windows may refuse; the demo then lasts for this page.
  }
}

function recall(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function useDemo() {
  const snap = useSnapshot(state)

  useEffect(() => {
    if (read || !DEMO_ENABLED) return
    read = true
    if (recall(KEY) === '1') state.demo = true
  }, [])

  const start = useCallback(() => {
    if (!DEMO_ENABLED) return
    state.demo = true
    remember(KEY, '1')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const end = useCallback(() => {
    state.demo = false
    remember(KEY, null)
  }, [])

  // An administrator sees the real toolbar, never the demo: nothing of it
  // shows until the login is known, and an administrator's browser forgets
  // the demo, so a demo tried before logging in is not shown again.
  const isAdmin = snap.member?.isAdmin === true
  const known = snap.memberLoaded
  useEffect(() => {
    if (known && isAdmin && state.demo) end()
  }, [known, isAdmin, end])

  return {
    enabled: DEMO_ENABLED && known && !isAdmin,
    demo: DEMO_ENABLED && known && snap.demo && !isAdmin,
    start,
    end,
  }
}

// Whether the demo's email has been sent from this browser in the last 24
// hours: the server's own window, so the button never opens before it would.
export function demoEmailSentToday(): boolean {
  const sent = Number(recall(SENT_KEY))
  return (
    Number.isFinite(sent) &&
    sent > 0 &&
    DateTime.now().toMillis() - sent < 86400000
  )
}

export function markDemoEmailSent() {
  remember(SENT_KEY, String(DateTime.now().toMillis()))
}
