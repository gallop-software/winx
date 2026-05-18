'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { DateTime } from 'luxon'

const DEFAULT_ENDPOINT = '/api/flow-trace'

// storage keys
const PATH_KEY = 'ft_path'
const FIRST_SEEN_KEY = 'ft_first'
const SESSION_START_KEY = 'ft_session_start'
const LAST_INTERACTION_KEY = 'ft_last_interaction'
const TIME_SPENT_KEY = 'ft_time_spent_ms'
const SESSION_SOURCE_KEY = 'ft_session_source'

const zone = 'America/Chicago'

// Luxon helpers
const nowDT = () => DateTime.now().setZone(zone)
const nowIso = () => nowDT().toISO()!
const nowMs = () => nowDT().toMillis()

// localStorage helpers
const safeGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
const safeSet = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {}
}
const safeGetNumber = (key: string): number => {
  const v = safeGet(key)
  const n = v ? Number(v) : 0
  return Number.isFinite(n) ? n : 0
}

// sessionStorage helpers
const ssGet = (key: string): string | null => {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}
const ssSet = (key: string, value: string) => {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {}
}

// write-once markers
const ensureFirstSeen = (ts?: string) => {
  const existing = safeGet(FIRST_SEEN_KEY)
  if (!existing) safeSet(FIRST_SEEN_KEY, ts || nowIso())
}

const ensureSessionStart = (ts?: string) => {
  const iso = ts || nowIso()
  if (!ssGet(SESSION_START_KEY)) ssSet(SESSION_START_KEY, iso)
  if (!ssGet(LAST_INTERACTION_KEY)) ssSet(LAST_INTERACTION_KEY, iso)
}

// interaction delta accounting (Luxon)
// returns ms since last interaction; updates last interaction; increments total
const takeInteractionDelta = (): number => {
  const lastIso = ssGet(LAST_INTERACTION_KEY)
  const current = nowDT()

  let delta = 0
  if (lastIso) {
    const lastDT = DateTime.fromISO(lastIso).setZone(zone)
    if (lastDT.isValid)
      delta = Math.max(0, current.diff(lastDT).as('milliseconds'))
  }

  // move the interaction pointer
  ssSet(LAST_INTERACTION_KEY, current.toISO()!)

  // increment global total
  if (delta > 0) {
    const prev = safeGetNumber(TIME_SPENT_KEY)
    safeSet(TIME_SPENT_KEY, String(prev + Math.round(delta)))
  }

  return Math.round(delta)
}

// path utils
type PathEntry = {
  path: string
  ts: string
  spentMs: number
  source?: string | undefined
}

const readPath = (): PathEntry[] => {
  const prev = safeGet(PATH_KEY)
  try {
    return prev ? JSON.parse(prev) : []
  } catch {
    return []
  }
}

const writePath = (arr: PathEntry[], max: number) => {
  const trimmed = arr.slice(-max)
  safeSet(PATH_KEY, JSON.stringify(trimmed))
}

const addDeltaToLastPathEntry = (deltaMs: number) => {
  if (deltaMs <= 0) return
  const arr = readPath()
  if (arr.length === 0) return
  const lastEntry = arr[arr.length - 1]
  if (lastEntry) {
    lastEntry.spentMs = (lastEntry.spentMs ?? 0) + deltaMs
  }
  safeSet(PATH_KEY, JSON.stringify(arr))
}

const pickRawSource = (
  utms: Record<string, string>,
  ref: string | null
): string => {
  if (ref && ref.length > 0) return ref
  if (utms.utm_source) return utms.utm_source
  return 'direct'
}

const recordPageView = (maxPath: number) => {
  const tsIso = nowIso()
  ensureFirstSeen(tsIso)
  ensureSessionStart(tsIso)

  const utms = Object.fromEntries(
    Array.from(new URLSearchParams(location.search)).filter(([key]) =>
      key.startsWith('utm_')
    )
  )
  const ref = document.referrer || ''
  const freshSource = pickRawSource(utms, ref)

  const hasParams = Object.keys(utms).length > 0
  const refHost = safeHostname(ref)
  const isExternalRef = !!refHost && refHost !== location.hostname
  const isNewExternalArrival = hasParams || isExternalRef

  const isValidExternal = (s?: string) => {
    if (!s) return false
    const v = s.toLowerCase()
    return (
      v !== 'direct' &&
      !v.includes('localhost') &&
      (!process.env.NEXT_PUBLIC_PRODUCTION_URL ||
        !v.includes(process.env.NEXT_PUBLIC_PRODUCTION_URL))
    )
  }

  const sessionSource = sessionStorage.getItem(SESSION_SOURCE_KEY)
  const isFirstExternalThisSession =
    isNewExternalArrival && !sessionSource && isValidExternal(freshSource)

  // Attribute time to the previous page
  addDeltaToLastPathEntry(takeInteractionDelta())

  const currentPath = location.pathname + location.search + location.hash
  const arr: PathEntry[] = readPath()
  const last = arr[arr.length - 1]

  // Avoid duplicate consecutive entries
  if (last?.path === currentPath) {
    writePath(arr, maxPath)
    return
  }

  const entry: PathEntry = {
    path: currentPath,
    ts: tsIso,
    spentMs: 0,
    source: isFirstExternalThisSession ? freshSource : undefined,
  }

  if (entry.source) sessionStorage.setItem(SESSION_SOURCE_KEY, entry.source)

  arr.push(entry)
  writePath(arr, maxPath)
}

// — helpers —
function safeHostname(url?: string | null): string | null {
  try {
    return url ? new URL(url).hostname : null
  } catch {
    return null // ignore bad referrer
  }
}

// sendBeacon wrapper
const sendNonBlocking = (url: string, payload: any) => {
  const blob = new Blob([JSON.stringify(payload)], {
    type: 'application/json',
  })
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, blob)
  } else {
    fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {})
  }
}

// payload (includes per-visit spentMs + source + total)
const buildPayload = () => {
  const path = readPath()
  const firstSeen = safeGet(FIRST_SEEN_KEY) || undefined
  const sessionStart = ssGet(SESSION_START_KEY) || undefined
  const timeSpentTotalMs = safeGetNumber(TIME_SPENT_KEY)

  return {
    firstSeen,
    sessionStart,
    timeSpentTotalMs,
    page: { url: location.href, title: document.title },
    path,
  }
}

// click interaction (.ft-tracking)
// attribute delta to the **last** entry (current page visit) and send payload
const attachDelegatedClick = (endpoint: string) => {
  const onClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    const el = target.closest('.ft-tracking') as HTMLElement | null
    if (!el) return

    // simple per-element debounce
    const key = '_ft_last_click_ts'
    const t = nowMs()
    const lastTs = (el as any)[key] as number | undefined
    if (lastTs && t - lastTs < 5000) return
    ;(el as any)[key] = t

    // attribute elapsed time to the current (last) entry
    const delta = takeInteractionDelta()
    addDeltaToLastPathEntry(delta)

    const payload = {
      element: {
        href: (el as HTMLAnchorElement).href || undefined,
        innerText: el.innerText?.trim() || undefined,
        id: el?.id || undefined,
      },
      context: buildPayload(),
    }

    sendNonBlocking(endpoint, payload)
  }

  document.addEventListener('click', onClick, { passive: true, capture: true })
  return () =>
    document.removeEventListener('click', onClick, { capture: true } as any)
}

export function FlowTrace() {
  const maxPath = 100
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    recordPageView(maxPath)

    const detachClicks = attachDelegatedClick(DEFAULT_ENDPOINT)
    return () => {
      detachClicks()
    }
  }, [pathname, searchParams])

  return null
}
