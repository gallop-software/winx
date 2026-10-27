import { flowTraceConfig } from '@/utils/flow-trace-config'
import {
  FT_CONVERSIONS,
  FT_EMAIL_MODES,
  FT_EVENT_TYPES,
  FT_REPORT_STATUSES,
  type FtConversion,
  type FtCounts,
  type FtEmailMode,
  type FtEvent,
  type FtPayload,
  type FtReportSend,
  type FtReportStatus,
  type FtStep,
  type FtSummary,
  type FtVisit,
  type FtVisitPage,
  type FtVisitReport,
} from '@/utils/flow-trace-types'
import type { D1, D1Statement } from '@/utils/d1'

// FlowTrace's tables (prisma/migrations/0013_flow_trace.sql): writing a
// visit that converted, as its browser sent it to /api/flow-trace, and
// reading visits back for the FlowTrace box, the emails and the scheduled
// job. Only visits that converted are ever stored: ordinary views are
// Analytics' (src/utils/page-views.ts). Every function is handed the DB
// binding, and nothing here imports server-only, so the scheduled job in
// worker.ts can use them outside Next.js.

export const VISITS_PER_PAGE = 50

const MAX_PATH = 300
const MAX_TEXT = 200
const MAX_ENGAGED_MS = 30 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

// --- Reading what the browser sent ---

/** Text a visitor's browser sent, cut to size and with nothing unprintable. */
function clean(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max)
}

function number(value: unknown, min: number, max: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min
}

const ID = /^[A-Za-z0-9-]{8,64}$/

// Whether a value is a path on this site and nothing else, so that a browser
// cannot read it as another site: `//evil.com`, `/\evil.com`, a tab or
// newline that browsers drop, and an encoded slash are all refused. The
// paths are links in the box and in the report email.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/
const ENCODED_SEPARATOR = /%2[fF]|%5[cC]/
const PARSER_ORIGIN = 'https://site.invalid'

function isSitePath(value: string): boolean {
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    CONTROL_CHARACTERS.test(value)
  ) {
    return false
  }
  const pathEnd = value.search(/[?#]/)
  const path = pathEnd === -1 ? value : value.slice(0, pathEnd)
  if (ENCODED_SEPARATOR.test(path)) return false
  try {
    return new URL(value, PARSER_ORIGIN).origin === PARSER_ORIGIN
  } catch {
    return false
  }
}

function isIgnoredPath(path: string): boolean {
  const bare = path.split('?')[0] ?? path
  return flowTraceConfig.ignoredPaths.some(
    (ignored) => bare === ignored || bare.startsWith(`${ignored}/`)
  )
}

// A path with only the query keys the browser keeps (src/hooks/flow-trace.tsx):
// a request made by hand cannot store a token or a key either.
const KEPT_PARAMS = /^(page|q|s|utm_[a-z]+)$/

function keptPath(value: string): string {
  const [path = '', query = ''] = value.split('#')[0]!.split('?')
  const kept = new URLSearchParams()
  for (const [key, val] of new URLSearchParams(query)) {
    if (KEPT_PARAMS.test(key)) kept.append(key, val)
  }
  const search = kept.toString()
  return search ? `${path}?${search}` : path
}

function parseStep(raw: unknown): FtStep | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Record<string, unknown>
  const type = input.t as FtStep['t']
  const path = keptPath(clean(input.p, MAX_PATH))
  if (
    !FT_EVENT_TYPES.includes(type) ||
    // A path on this site only: it is shown as a link
    !isSitePath(path) ||
    isIgnoredPath(path) ||
    !Number.isFinite(Number(input.at))
  ) {
    return null
  }
  return {
    t: type,
    p: path,
    ti: clean(input.ti),
    at: Number(input.at),
    ms: number(input.ms, 0, MAX_ENGAGED_MS),
    l: clean(input.l),
    href: clean(input.href, MAX_PATH),
  }
}

/**
 * The visit as its browser sent it, checked and trimmed, or null when it is
 * not one. It must hold a conversion: nothing else is stored.
 */
export function parsePayload(raw: unknown): FtPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Record<string, unknown>
  if (
    typeof input.v !== 'string' ||
    typeof input.s !== 'string' ||
    !ID.test(input.v) ||
    !ID.test(input.s) ||
    !Array.isArray(input.steps) ||
    !Number.isFinite(Number(input.now))
  ) {
    return null
  }
  const steps = input.steps
    .slice(-flowTraceConfig.maxSteps)
    .map(parseStep)
    .filter((step): step is FtStep => step !== null)
    .sort((a, b) => a.at - b.at)
  if (!steps.some((step) => FT_CONVERSIONS.includes(step.t as FtConversion))) {
    return null
  }
  const utm = (input.u && typeof input.u === 'object' ? input.u : {}) as Record<
    string,
    unknown
  >
  return {
    v: input.v,
    s: input.s,
    n: Math.round(number(input.n, 1, 100000)),
    fs: Number(input.fs) || 0,
    tt: number(input.tt, 0, 1000 * DAY_MS),
    r: clean(input.r, MAX_PATH),
    u: {
      source: clean(utm.source, 100),
      medium: clean(utm.medium, 100),
      campaign: clean(utm.campaign, 100),
      term: clean(utm.term, 100),
      content: clean(utm.content, 100),
    },
    now: Number(input.now),
    steps,
  }
}

function bareHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '')
}

/** The site a visitor came from, or '' for this site or for nowhere. */
function referrerHost(raw: string, siteHost: string): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return ''
  }
  // A link opened from an Android app names the app: android-app://com.google.android.gm/
  if (url.protocol === 'android-app:') return clean(url.hostname, 100)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
  const host = bareHost(url.hostname)
  const own = new Set([bareHost(siteHost.split(':')[0] ?? '')])
  try {
    own.add(
      bareHost(new URL(process.env.NEXT_PUBLIC_PRODUCTION_URL ?? '').hostname)
    )
  } catch {
    // Not an address: only the request's own host counts
  }
  return own.has(host) ? '' : clean(host, 100)
}

// --- Recording ---

export type FtRequestFacts = {
  /** The host the request was made to */
  siteHost: string
  ip: string
  country: string
  region: string
  city: string
  // What the user agent names, read by the endpoint (parseUserAgent in
  // src/utils/page-views.ts). The user agent itself is not stored.
  device: string
  browser: string
  os: string
  /** Unix seconds */
  now: number
}

/**
 * Writes a visit that has just converted, with every step of it, marked not
 * yet reported. A visit that converts again is sent again whole, and its
 * steps are replaced.
 *
 * Times come from the visitor's clock, which may be wrong; only the gaps
 * between them are trusted. They are laid back from the server's time of
 * arrival, which is when the browser sent them.
 */
export async function recordConversion(
  db: D1,
  visit: FtPayload,
  facts: FtRequestFacts
): Promise<void> {
  const { device, browser, os } = facts
  const country = /^[A-Za-z]{2}$/.test(facts.country)
    ? facts.country.toUpperCase()
    : ''
  const toServer = (at: number) =>
    Math.min(facts.now, facts.now - Math.round((visit.now - at) / 1000))
  const steps = visit.steps
  const first = steps[0]!
  const conversions = steps.filter((step) =>
    FT_CONVERSIONS.includes(step.t as FtConversion)
  )
  const engaged = steps.reduce((sum, step) => sum + (step.ms ?? 0), 0)
  const firstSeen =
    visit.fs && visit.fs <= visit.now ? toServer(visit.fs) : toServer(first.at)

  const statements: D1Statement[] = [
    db
      .prepare(
        `INSERT INTO ft_visits (id, visitor_id, visit_number, started_at, last_at,
           entry_path, referrer, utm_source, utm_medium, utm_campaign, utm_term,
           utm_content, country, region, city, device, browser, os, ip,
           pageviews, engaged_ms, conversions, first_conversion, first_seen,
           visitor_engaged_ms, reported_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
           ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, NULL)
         ON CONFLICT (id) DO UPDATE SET
           last_at = excluded.last_at, pageviews = excluded.pageviews,
           engaged_ms = excluded.engaged_ms, conversions = excluded.conversions,
           visitor_engaged_ms = excluded.visitor_engaged_ms, reported_at = NULL,
           report_status = 'waiting'`
      )
      .bind(
        visit.s,
        visit.v,
        visit.n,
        toServer(first.at),
        facts.now,
        first.p,
        referrerHost(visit.r ?? '', facts.siteHost),
        visit.u?.source ?? '',
        visit.u?.medium ?? '',
        visit.u?.campaign ?? '',
        visit.u?.term ?? '',
        visit.u?.content ?? '',
        country,
        clean(facts.region, 100),
        clean(facts.city, 100),
        device,
        browser,
        os,
        clean(facts.ip, 45),
        steps.filter((step) => step.t === 'pageview').length,
        engaged,
        conversions.length,
        conversions[0]?.t ?? '',
        firstSeen,
        Math.max(visit.tt, engaged)
      ),
    db.prepare('DELETE FROM ft_events WHERE visit_id = ?1').bind(visit.s),
    ...steps.map((step) =>
      db
        .prepare(
          `INSERT INTO ft_events (visit_id, at, type, path, title, label, href, engaged_ms)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
        )
        .bind(
          visit.s,
          toServer(step.at),
          step.t,
          step.p,
          step.ti ?? '',
          step.l ?? '',
          step.href ?? '',
          Math.round(step.ms ?? 0)
        )
    ),
  ]

  await db.batch(statements)
}

// --- Reading ---

type VisitRow = {
  id: string
  visitor_id: string
  visit_number: number
  started_at: number
  last_at: number
  entry_path: string
  referrer: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string
  utm_content: string
  country: string
  region: string
  city: string
  device: string
  browser: string
  os: string
  ip: string
  pageviews: number
  engaged_ms: number
  conversions: number
  first_conversion: string
  reported_at: number | null
  report_status: string
  first_seen: number | null
  visitor_engaged_ms: number | null
}

function toVisit(row: VisitRow): FtVisit {
  return {
    id: row.id,
    visitorId: row.visitor_id,
    visitNumber: row.visit_number,
    startedAt: row.started_at,
    lastAt: row.last_at,
    entryPath: row.entry_path,
    referrer: row.referrer,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmTerm: row.utm_term,
    utmContent: row.utm_content,
    country: row.country,
    region: row.region,
    city: row.city,
    device: row.device,
    browser: row.browser,
    os: row.os,
    ip: row.ip,
    pageviews: row.pageviews,
    engagedMs: row.engaged_ms,
    conversions: row.conversions,
    firstConversion: row.first_conversion,
    reportedAt: row.reported_at,
    reportStatus: FT_REPORT_STATUSES.includes(
      row.report_status as FtReportStatus
    )
      ? (row.report_status as FtReportStatus)
      : 'waiting',
    firstSeen: row.first_seen,
    visitorEngagedMs: row.visitor_engaged_ms ?? row.engaged_ms,
  }
}

type EventRow = {
  id: number
  at: number
  type: FtEvent['type']
  path: string
  title: string
  label: string
  href: string
  engaged_ms: number
}

/**
 * One page of converted visits, newest first, between `from` and `to` (Unix
 * seconds). `ip` narrows it to one address; `search` finds an address, or a
 * page any step of the visit was on, by a part of it.
 */
export async function listVisits(
  db: D1,
  input: {
    page: number
    from?: number
    to?: number
    ip?: string
    search?: string
  }
): Promise<FtVisitPage> {
  const ip = clean(input.ip ?? '', 45)
  const search = clean(input.search ?? '', 100).replace(/[\\%_]/g, '\\$&')
  const like = search ? `%${search}%` : ''
  const where = `started_at >= ?1 AND started_at < ?2
    AND (?3 = '' OR ip = ?3)
    AND (?4 = '' OR ip LIKE ?4 ESCAPE '\\' OR EXISTS (
      SELECT 1 FROM ft_events e WHERE e.visit_id = ft_visits.id
        AND e.path LIKE ?4 ESCAPE '\\'))`
  const args = [input.from ?? 0, input.to ?? Number.MAX_SAFE_INTEGER, ip, like]
  const [found, count] = await db.batch([
    db
      .prepare(
        `SELECT * FROM ft_visits WHERE ${where}
         ORDER BY started_at DESC LIMIT ?5 OFFSET ?6`
      )
      .bind(...args, VISITS_PER_PAGE, (input.page - 1) * VISITS_PER_PAGE),
    db
      .prepare(`SELECT COUNT(*) AS total FROM ft_visits WHERE ${where}`)
      .bind(...args),
  ])
  const total = Number(
    (count?.results[0] as { total?: number } | undefined)?.total ?? 0
  )
  return {
    rows: ((found?.results ?? []) as VisitRow[]).map(toVisit),
    total,
    page: input.page,
    pages: Math.max(1, Math.ceil(total / VISITS_PER_PAGE)),
  }
}

/** A visit, what happened on it, and the visitor's other converted visits. */
export async function readVisitReport(
  db: D1,
  id: string
): Promise<FtVisitReport | null> {
  if (!ID.test(id)) return null
  const row = await db
    .prepare('SELECT * FROM ft_visits WHERE id = ?1')
    .bind(id)
    .first<VisitRow>()
  if (!row) return null

  const [events, others, sends] = await db.batch([
    db
      .prepare('SELECT * FROM ft_events WHERE visit_id = ?1 ORDER BY at, id')
      .bind(id),
    db
      .prepare(
        `SELECT * FROM ft_visits WHERE visitor_id = ?1 AND id != ?2
         ORDER BY started_at DESC LIMIT 20`
      )
      .bind(row.visitor_id, id),
    db
      .prepare(
        `SELECT email, at, ok, error FROM ft_report_sends
         WHERE visit_id = ?1 ORDER BY at DESC, id DESC LIMIT 50`
      )
      .bind(id),
  ])

  return {
    visit: toVisit(row),
    events: ((events?.results ?? []) as EventRow[]).map((event) => ({
      id: event.id,
      at: event.at,
      type: event.type,
      path: event.path,
      title: event.title,
      label: event.label,
      href: event.href,
      engagedMs: event.engaged_ms,
    })),
    otherVisits: ((others?.results ?? []) as VisitRow[]).map(toVisit),
    sends: (
      (sends?.results ?? []) as {
        email: string
        at: number
        ok: number
        error: string
      }[]
    ).map(
      (send): FtReportSend => ({
        email: send.email,
        at: send.at,
        ok: Boolean(send.ok),
        error: send.error,
      })
    ),
  }
}

// How a visit's source is grouped in SQL: the same order as sourceOf in
// src/utils/flow-trace-format.ts (campaign, then referrer, then Direct).
const SOURCE_SQL = `CASE WHEN utm_source != '' THEN utm_source
  WHEN referrer != '' THEN referrer ELSE 'Direct' END`

function emptyConversions(): Record<FtConversion, number> {
  return Object.fromEntries(FT_CONVERSIONS.map((type) => [type, 0])) as Record<
    FtConversion,
    number
  >
}

/** How many converted visits and conversions between two times. */
export async function readCounts(
  db: D1,
  from: number,
  to: number
): Promise<FtCounts> {
  const range = 'started_at >= ?1 AND started_at < ?2'
  const [totals, byType] = await db.batch([
    db
      .prepare(`SELECT COUNT(*) AS converted FROM ft_visits WHERE ${range}`)
      .bind(from, to),
    db
      .prepare(
        `SELECT type, COUNT(*) AS n FROM ft_events
         WHERE visit_id IN (SELECT id FROM ft_visits WHERE ${range})
           AND type IN (${FT_CONVERSIONS.map((type) => `'${type}'`).join(', ')})
         GROUP BY type`
      )
      .bind(from, to),
  ])
  const conversions = emptyConversions()
  for (const row of (byType?.results ?? []) as { type: string; n: number }[]) {
    if (row.type in conversions) conversions[row.type as FtConversion] = row.n
  }
  return {
    converted: Number(
      (totals?.results[0] as { converted?: number } | undefined)?.converted ?? 0
    ),
    conversions,
  }
}

/** The converted visits between two times (Unix seconds, `to` not included). */
export async function readSummary(
  db: D1,
  from: number,
  to: number
): Promise<FtSummary> {
  const range = 'started_at >= ?1 AND started_at < ?2'
  const grouped = (columns: [string, string, string], present: string) =>
    db
      .prepare(
        `SELECT ${columns[0]} AS a, ${columns[1]} AS b, ${columns[2]} AS c, COUNT(*) AS views
         FROM ft_visits WHERE ${range} AND ${present}
         GROUP BY a, b, c ORDER BY views DESC, a LIMIT 50`
      )
      .bind(from, to)
  const [counts, results] = await Promise.all([
    readCounts(db, from, to),
    db.batch([
      grouped([SOURCE_SQL, "''", "''"], 'true'),
      db
        .prepare(
          // A page with a campaign's ?utm_… is still the same page
          `SELECT CASE WHEN instr(path, '?') > 0
                    THEN substr(path, 1, instr(path, '?') - 1) ELSE path END AS a,
             COUNT(*) AS views FROM ft_events
           WHERE visit_id IN (SELECT id FROM ft_visits WHERE ${range})
             AND type = 'pageview'
           GROUP BY a ORDER BY views DESC, a LIMIT 50`
        )
        .bind(from, to),
      grouped(['country', "''", "''"], "country != ''"),
      grouped(['region', 'country', "''"], "region != ''"),
      grouped(['city', 'region', 'country'], "city != ''"),
      grouped(['browser', 'os', 'device'], "browser != ''"),
      db
        .prepare(
          `SELECT * FROM ft_visits WHERE ${range}
           ORDER BY started_at DESC LIMIT 25`
        )
        .bind(from, to),
    ]),
  ])
  type Grouped = { a: string; b: string; c: string; views: number }
  const rows = (index: number) => (results[index]?.results ?? []) as Grouped[]

  return {
    from,
    to,
    visits: null,
    ...counts,
    sources: rows(0).map((row) => ({
      key: row.a,
      label: row.a,
      views: row.views,
    })),
    pages: rows(1).map((row) => ({
      key: row.a,
      label: row.a,
      href: row.a,
      views: row.views,
    })),
    countries: rows(2).map((row) => ({
      key: row.a,
      label: row.a,
      country: row.a,
      views: row.views,
    })),
    regions: rows(3).map((row) => ({
      key: `${row.a}|${row.b}`,
      label: row.a,
      country: row.b,
      views: row.views,
    })),
    cities: rows(4).map((row) => ({
      key: `${row.a}|${row.b}|${row.c}`,
      label: [row.a, row.b].filter(Boolean).join(', '),
      country: row.c,
      views: row.views,
    })),
    devices: rows(5).map((row) => {
      const label = `${row.a} on ${row.b} · ${row.c}`
      return { key: label, label, views: row.views }
    }),
    convertedVisits: ((results[6]?.results ?? []) as VisitRow[]).map(toVisit),
  }
}

/** The latest visit. */
export async function latestVisitId(db: D1): Promise<string | null> {
  const row = await db
    .prepare('SELECT id FROM ft_visits ORDER BY started_at DESC LIMIT 1')
    .first<{ id: string }>()
  return row?.id ?? null
}

// --- Reports not sent ---

/**
 * Visits whose report has not gone out, written between `since` and
 * `before`: newest first, so a backlog never holds up a fresh report.
 */
export async function readUnsent(
  db: D1,
  since: number,
  before: number
): Promise<FtVisit[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM ft_visits
       WHERE reported_at IS NULL AND last_at > ?1 AND last_at <= ?2
       ORDER BY last_at DESC LIMIT 20`
    )
    .bind(since, before)
    .all<VisitRow>()
  return results.map(toVisit)
}

/**
 * Gives up on reports still not sent once the retry time has passed: they
 * show as failed, and the visit stays in FlowTrace and the summaries.
 */
export async function expireUnsent(db: D1, before: number, now: number) {
  await db
    .prepare(
      `UPDATE ft_visits SET reported_at = ?2, report_status = 'failed'
       WHERE reported_at IS NULL AND last_at <= ?1`
    )
    .bind(before, now)
    .run()
}

/** How many reports went out since a time, in all and for one address. */
export async function countReports(
  db: D1,
  since: number,
  ip: string
): Promise<{ all: number; fromAddress: number }> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS all_reports,
         SUM(CASE WHEN ip = ?2 AND ?2 != '' THEN 1 ELSE 0 END) AS from_address
       FROM ft_visits WHERE report_status = 'sent' AND reported_at >= ?1`
    )
    .bind(since, ip)
    .first<{ all_reports: number; from_address: number | null }>()
  return { all: row?.all_reports ?? 0, fromAddress: row?.from_address ?? 0 }
}

/**
 * Settles a visit's report: sent, failed for good, past the hourly limit, or
 * with nobody to send it to. A visit left 'waiting' is tried again by the
 * scheduled job.
 */
export async function markReported(
  db: D1,
  id: string,
  at: number,
  status: Exclude<FtReportStatus, 'waiting'>
) {
  await db
    .prepare(
      'UPDATE ft_visits SET reported_at = ?2, report_status = ?3 WHERE id = ?1'
    )
    .bind(id, at, status)
    .run()
}

/** Writes down one attempt to email a visit's report to one person. */
export async function recordReportSend(
  db: D1,
  visitId: string,
  send: FtReportSend
) {
  await db
    .prepare(
      `INSERT INTO ft_report_sends (visit_id, email, at, ok, error)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(
      visitId,
      send.email,
      send.at,
      send.ok ? 1 : 0,
      send.error.slice(0, 200)
    )
    .run()
}

// --- Email settings ---

export function isEmailMode(value: unknown): value is FtEmailMode {
  return FT_EMAIL_MODES.includes(value as FtEmailMode)
}

/** Each address's choice, or the default for those who have not chosen. */
export async function readEmailModes(
  db: D1,
  emails: string[]
): Promise<Map<string, FtEmailMode>> {
  const modes = new Map<string, FtEmailMode>(
    emails.map((email) => [email, flowTraceConfig.defaultEmailMode])
  )
  if (!emails.length) return modes
  const { results } = await db
    .prepare(
      `SELECT email, mode FROM ft_email_settings
       WHERE email IN (${emails.map((_, i) => `?${i + 1}`).join(', ')})`
    )
    .bind(...emails)
    .all<{ email: string; mode: string }>()
  for (const row of results) {
    if (isEmailMode(row.mode)) modes.set(row.email, row.mode)
  }
  return modes
}

export async function saveEmailMode(
  db: D1,
  email: string,
  mode: FtEmailMode,
  now: number
) {
  await db
    .prepare(
      `INSERT INTO ft_email_settings (email, mode, updated_at) VALUES (?1, ?2, ?3)
       ON CONFLICT (email) DO UPDATE SET mode = excluded.mode, updated_at = excluded.updated_at`
    )
    .bind(email.toLowerCase(), mode, now)
    .run()
}

/** Gives a summary back, so a send that failed is tried on the next run. */
export async function releaseDigest(
  db: D1,
  kind: 'daily' | 'weekly',
  period: string
) {
  await db
    .prepare('DELETE FROM ft_digests WHERE kind = ?1 AND period = ?2')
    .bind(kind, period)
    .run()
}

/**
 * Claims a summary so it goes out once, even if two runs overlap. True when
 * this run is the one to send it.
 */
export async function claimDigest(
  db: D1,
  kind: 'daily' | 'weekly',
  period: string,
  now: number
): Promise<boolean> {
  const result = await db
    .prepare(
      'INSERT OR IGNORE INTO ft_digests (kind, period, sent_at) VALUES (?1, ?2, ?3)'
    )
    .bind(kind, period, now)
    .run()
  return (result.meta?.changes ?? 0) > 0
}
