'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { flowTraceConfig } from '@/utils/flow-trace-config'
import type {
  FtConversion,
  FtPayload,
  FtStep,
  FtUtm,
} from '@/utils/flow-trace-types'

// FlowTrace's browser side. The visit (where the visitor came from, the pages
// they see and how long each is in front of them) is kept here, in
// localStorage, and nothing is sent while they only read: counting views is
// Analytics' (src/hooks/page-view.tsx). When they do something that counts
// (the contact form, a newsletter sign-up, a new account, an email or phone
// link, a tracked click) the whole visit is sent to /api/flow-trace, which
// stores it and emails the report. See flow-trace.md.

const ENDPOINT = '/api/flow-trace/'
const VISITOR_KEY = 'ft_visitor'
const FIRST_SEEN_KEY = 'ft_first'
const VISITS_KEY = 'ft_visits'
const TOTAL_KEY = 'ft_total_ms'
const VISIT_KEY = 'ft_visit'
const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const
// What the server keeps of a path, a title and a label: sent no longer, so a
// long visit stays within what a beacon may carry.
const MAX_PATH = 300
const MAX_TEXT = 200
// The same link pressed again within this long is one conversion.
const REPEAT_MS = 5000

type Visit = {
  id: string
  /** Last activity, ms */
  last: number
  r: string
  u: FtUtm
  /** The arrival that started it, so a reload of that page is not another */
  a?: string
  steps: FtStep[]
}

// The time in milliseconds, without loading a date library on every page.
const nowMs = () => Math.round(performance.timeOrigin + performance.now())

// Where storage is blocked, the visit lives as long as the page does.
const memory = new Map<string, string>()

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    memory.set(key, value)
  }
}

function readNumber(key: string): number {
  const n = Number(read(key))
  return Number.isFinite(n) ? n : 0
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${nowMs().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** The visitor's id, made on their first page and kept. */
function visitorId(): string {
  let id = read(VISITOR_KEY)
  if (!id) {
    id = newId()
    write(VISITOR_KEY, id)
    write(FIRST_SEEN_KEY, String(nowMs()))
  }
  return id
}

function readVisit(): Visit | null {
  try {
    const visit = JSON.parse(read(VISIT_KEY) ?? 'null') as Visit | null
    return visit?.id &&
      typeof visit.last === 'number' &&
      Array.isArray(visit.steps)
      ? visit
      : null
  } catch {
    return null
  }
}

function isConversion(step: FtStep): boolean {
  return step.t !== 'pageview'
}

function saveVisit(visit: Visit) {
  visit.last = nowMs()
  // Too long a visit loses its oldest pages first; its conversions stay.
  while (visit.steps.length > flowTraceConfig.maxSteps) {
    const page = visit.steps.findIndex((step) => !isConversion(step))
    visit.steps.splice(page === -1 ? 0 : page, 1)
  }
  write(VISIT_KEY, JSON.stringify(visit))
}

type Page = { path: string; visibleSince: number | null }

// The page in front of the visitor, shared by the component and
// trackConversion, so a conversion carries the time spent on it so far.
let page: Page | null = null

/**
 * Whether the visit has ended: nothing done for visitIdleMinutes. A page
 * that has stayed in front of the visitor all that time is reading, not
 * idleness: half an hour on one page and then a call is still one visit.
 * Only the page in front of them since before the visit's last activity
 * counts: a page loaded or shown again later is not the same reading, even
 * where the visit saw that address before (else a visit never ended for
 * anyone who came back to a page they had seen).
 */
function isExpired(visit: Visit | null): boolean {
  if (!visit) return true
  const reading =
    page?.visibleSince != null &&
    page.visibleSince <= visit.last &&
    visit.steps.some((step) => step.t === 'pageview' && step.p === page?.path)
  if (reading) return false
  return nowMs() - visit.last > flowTraceConfig.visitIdleMinutes * 60000
}

type Arrival = { r: string; u: FtUtm; key: string }

/**
 * The visit under way, or a new one when the last expired, or when `arrival`
 * says they have just come from elsewhere (and it is not the same arrival
 * again, as a reload or the back button gives).
 */
function currentVisit(arrival?: Arrival): Visit {
  const saved = readVisit()
  if (saved && !isExpired(saved) && (!arrival || saved.a === arrival.key)) {
    return saved
  }
  visitorId()
  write(VISITS_KEY, String(readNumber(VISITS_KEY) + 1))
  return {
    id: newId(),
    last: nowMs(),
    r: arrival?.r ?? '',
    u: arrival?.u ?? {},
    ...(arrival ? { a: arrival.key } : {}),
    steps: [],
  }
}

function isIgnored(path: string): boolean {
  return flowTraceConfig.ignoredPaths.some(
    (ignored) => path === ignored || path.startsWith(`${ignored}/`)
  )
}

// The query keys a page's address keeps: the page of a list, a search and
// campaign tags. Anything else (a signed link's token, a reset key) never
// leaves the browser.
const KEPT_PARAMS = /^(page|q|s|utm_[a-z]+)$/

function keptSearch(): string {
  const kept = new URLSearchParams()
  for (const [key, value] of new URLSearchParams(location.search)) {
    if (KEPT_PARAMS.test(key)) kept.append(key, value)
  }
  const search = kept.toString()
  return search ? `?${search}` : ''
}

function currentPath(): string {
  return (location.pathname + keptSearch()).slice(0, MAX_PATH)
}

// Where a visitor came from, without the query string another site put in
// its own address.
function referrerOf(value: string): string {
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`.slice(0, MAX_PATH)
  } catch {
    return ''
  }
}

function pageTitle(): string {
  return document.title.slice(0, MAX_TEXT)
}

/** Adds time on a page to its latest view in the visit, and to the total. */
function addEngagement(visit: Visit, path: string, ms: number) {
  if (ms <= 0) return
  const step = [...visit.steps]
    .reverse()
    .find((entry) => entry.t === 'pageview' && entry.p === path)
  if (step) step.ms = Math.round((step.ms ?? 0) + ms)
  write(TOTAL_KEY, String(Math.round(readNumber(TOTAL_KEY) + ms)))
}

// A beacon outlives the page, so a call that opens the dialer is not lost.
// As text/plain it needs no preflight.
function send(payload: FtPayload) {
  const body = JSON.stringify(payload)
  if (navigator.sendBeacon?.(ENDPOINT, body)) return
  fetch(ENDPOINT, {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'Content-Type': 'text/plain' },
  }).catch(() => {})
}

/** Moves the time the current page has been visible into the visit. */
function settlePage(visit: Visit) {
  if (!page || page.visibleSince === null) return
  const now = nowMs()
  addEngagement(visit, page.path, now - page.visibleSince)
  page.visibleSince = document.visibilityState === 'visible' ? now : null
}

/**
 * Records a conversion from the site's own code, such as a form that was
 * sent, and sends the visit. Clicks on phone and email links and on
 * `.ft-tracking` or `[data-ft]` elements are recorded without it. The
 * contact form, the newsletter forms and a new account call it.
 */
export function trackConversion(type: FtConversion, label = '', href = '') {
  if (typeof window === 'undefined' || isIgnored(location.pathname)) return
  const expired = isExpired(readVisit())
  const visit = currentVisit()
  if (expired) {
    // Back after the visit expired: the page they are on starts the new one,
    // and the time before does not belong to it
    visit.steps.push({
      t: 'pageview',
      p: currentPath(),
      ti: pageTitle(),
      at: nowMs(),
      ms: 0,
    })
    if (page) {
      page.visibleSince =
        document.visibilityState === 'visible' ? nowMs() : null
    }
  } else {
    settlePage(visit)
  }
  visit.steps.push({
    t: type,
    p: currentPath(),
    at: nowMs(),
    l: label.slice(0, MAX_TEXT),
    href: href.slice(0, MAX_PATH),
  })
  saveVisit(visit)
  send({
    v: visitorId(),
    s: visit.id,
    n: Math.max(1, readNumber(VISITS_KEY)),
    fs: readNumber(FIRST_SEEN_KEY),
    tt: readNumber(TOTAL_KEY),
    r: visit.r,
    u: visit.u,
    now: nowMs(),
    steps: visit.steps,
  })
}

// The first page of a load is the only one whose document.referrer says where
// the visitor came from; later client-side navigations keep the same value.
let firstPageOfLoad = true
let lastView = { path: '', at: 0 }

/** Where they came from, when this load is an arrival from elsewhere. */
function arrival(): Arrival | undefined {
  const params = new URLSearchParams(location.search)
  const u = Object.fromEntries(
    UTM_KEYS.map((key) => [key, (params.get(`utm_${key}`) ?? '').slice(0, 100)])
  ) as FtUtm
  const hasUtm = UTM_KEYS.some((key) => u[key])
  let external = false
  try {
    external =
      !!document.referrer && new URL(document.referrer).host !== location.host
  } catch {
    // An unreadable referrer is no arrival
  }
  if (!hasUtm && !external) return undefined
  const r = external ? referrerOf(document.referrer) : ''
  return { r, u, key: `${r}|${currentPath()}` }
}

function recordPageview(path: string, force = false) {
  // The same page again within a second is one view: React runs effects
  // twice in development, and a re-render can repeat the route effect.
  const now = nowMs()
  const repeat = !force && lastView.path === path && now - lastView.at < 1000
  page = {
    path,
    visibleSince: document.visibilityState === 'visible' ? now : null,
  }
  if (repeat) return
  lastView = { path, at: now }

  // Decided once per load, before anything else can change it
  const first = firstPageOfLoad
  firstPageOfLoad = false
  const visit = currentVisit(first ? arrival() : undefined)
  visit.steps.push({ t: 'pageview', p: path, ti: pageTitle(), at: now, ms: 0 })
  saveVisit(visit)

  // Next.js sets the new title just after the route changes
  window.setTimeout(() => {
    const saved = readVisit()
    const step = saved?.steps.find(
      (entry) => entry.t === 'pageview' && entry.at === now
    )
    if (saved && step) {
      step.ti = pageTitle()
      write(VISIT_KEY, JSON.stringify(saved))
    }
  }, 150)
}

/** Moves the current page's time into the visit, if it is still going. */
function settleVisit() {
  const visit = readVisit()
  if (visit && !isExpired(visit)) {
    settlePage(visit)
    saveVisit(visit)
  }
}

/** A link's address part, decoded where it can be: `tel:%2B1…` reads +1… */
function decoded(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// Watches the path only, as the page-view hook does: reading the query here
// would make every page render this part on the client. Rendered in the root
// layout; it draws nothing, so the page's HTML is the same for everyone.
export function FlowTrace() {
  const pathname = usePathname()
  const listening = useRef(false)

  useEffect(() => {
    settleVisit()
    page = null
    if (isIgnored(pathname)) return
    recordPageview(currentPath())
  }, [pathname])

  useEffect(() => {
    if (listening.current) return
    listening.current = true

    const onVisibility = () => {
      if (!page) return
      if (document.visibilityState === 'hidden') {
        settleVisit()
        page.visibleSince = null
        return
      }
      // Back after the visit expired: the same page starts a new visit
      if (isExpired(readVisit())) recordPageview(page.path, true)
      else page.visibleSince = nowMs()
    }

    const lastClick = new Map<string, number>()
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (!target || isIgnored(location.pathname)) return
      const link = target.closest<HTMLAnchorElement>('a[href]')
      const tracked = target.closest<HTMLElement>('.ft-tracking, [data-ft]')
      const href = link?.getAttribute('href') ?? ''

      let type: FtConversion | null = null
      let label = ''
      if (href.startsWith('tel:')) {
        type = 'call'
        label = decoded(href.slice(4))
      } else if (href.startsWith('mailto:')) {
        type = 'email'
        label = decoded(href.slice(7).split('?')[0] ?? '')
      } else if (tracked) {
        type = 'click'
        label =
          tracked.dataset.ft || tracked.innerText?.trim().slice(0, 100) || ''
      }
      if (!type) return

      const key = `${type}|${label}`
      const now = nowMs()
      if (now - (lastClick.get(key) ?? 0) < REPEAT_MS) return
      lastClick.set(key, now)
      trackConversion(type, label, link?.href ?? '')
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', settleVisit)
    document.addEventListener('click', onClick, { capture: true })
    return () => {
      listening.current = false
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', settleVisit)
      document.removeEventListener('click', onClick, { capture: true })
    }
  }, [])

  return null
}

export default FlowTrace
