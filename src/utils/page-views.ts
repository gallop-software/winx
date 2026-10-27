import 'server-only'
import { DateTime } from 'luxon'
import pagesData from '@/../_data/_pages.json'
import { getDb, type D1, type D1Statement } from '@/utils/d1'
import { normalizePostUrl, parsePostUrl } from '@/utils/post-url'
import type {
  LiveCounts,
  PageViewReport,
  ViewBucket,
  ViewCount,
  ViewListRow,
  ViewPeriod,
  VisitLogPage,
  VisitRow,
} from '@/utils/page-view-types'

// Page views, counted by the site itself. A view adds to the day's counts
// (page_views) and writes one row to the log (page_view_log); both are kept
// forever. A visitor is an IP address seen for the first time that day, which
// the log is asked about as the view is counted. /api/view records them; the
// routes under /api/analytics read them for an administrator.

// A day starts and ends by the site's clock, the one WordPress is set to.
const SITE_ZONE = 'America/Chicago'

const LIST_LENGTH = 50
export const VISITS_PER_PAGE = 50

const MAX_PATH = 200
const MAX_UTM = 100

type Page = { uri: string; title?: string }

// The pages built into the site, by path, with their titles. WordPress pages
// are in the content index (the pages table) instead.
const STATIC_PAGES = new Map(
  (pagesData as Page[]).map((page) => [
    normalizePostUrl(page.uri) || '/',
    page.title ?? '',
  ])
)

const ARCHIVE_PATH = /^\/(category|tag|author)\/([^/]+)$/

function today(): DateTime {
  return DateTime.now().setZone(SITE_ZONE).startOf('day')
}

function dayOf(date: DateTime): string {
  return date.toFormat('yyyy-MM-dd')
}

// What a visitor's browser sent, cut to size and with nothing unprintable.
function clean(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max)
}

// --- Recording ---

// The path in the form it is counted under, or null when it is not a page of
// this site. A path someone made up, or a page that is not there, is not
// counted: the tables only ever hold pages that exist.
async function countedPath(db: D1, raw: string): Promise<string | null> {
  if (!raw.startsWith('/') || raw.length > MAX_PATH * 3) return null
  const path = normalizePostUrl(raw) || '/'
  if (path.length > MAX_PATH) return null

  if (STATIC_PAGES.has(path) || path === '/search' || ARCHIVE_PATH.test(path)) {
    return path
  }
  if (parsePostUrl(path)) {
    const post = await db
      .prepare('SELECT 1 FROM posts WHERE url = ?1')
      .bind(path)
      .first()
    return post ? path : null
  }
  // A WordPress page, as the content index knows it.
  const page = await db
    .prepare('SELECT 1 FROM pages WHERE path = ?1')
    .bind(path)
    .first()
  return page ? path : null
}

function bareHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '')
}

// The site a visitor came from, as its host name. `own` when it was a page
// of this site, which is not somewhere they came from.
function referrerOf(
  raw: string,
  siteHost: string
): { host: string; own: boolean } {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { host: '', own: false }
  }
  // A link opened from an Android app names the app, not a site:
  // android-app://com.google.android.gm/ is Gmail.
  if (url.protocol === 'android-app:') {
    return { host: clean(url.hostname.toLowerCase(), 100), own: false }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { host: '', own: false }
  }

  const host = bareHost(url.hostname)
  const own = new Set([bareHost(siteHost.split(':')[0] ?? '')])
  const production = process.env.NEXT_PUBLIC_PRODUCTION_URL
  if (production) {
    try {
      own.add(bareHost(new URL(production).hostname))
    } catch {
      // Not an address: only the request's own host counts.
    }
  }
  return own.has(host)
    ? { host: '', own: true }
    : { host: clean(host, 100), own: false }
}

const BOT =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|scrape|curl|wget|python|httpclient|facebookexternalhit|whatsapp/i

// True for a search engine, a link previewer, or a script. They run pages too,
// and are not readers.
export function isBot(userAgent: string): boolean {
  return !userAgent.trim() || BOT.test(userAgent)
}

// What kind of device, browser and system a user agent names. Kept to the
// few that matter; the user agent itself is not stored.
export function parseUserAgent(userAgent: string): {
  device: string
  browser: string
  os: string
} {
  const ua = userAgent

  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Macintosh|Mac OS X/.test(ua)
          ? 'macOS'
          : /CrOS/.test(ua)
            ? 'ChromeOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Other'

  // Most browsers name several others as well as themselves, so the order
  // matters: Edge says Chrome and Safari, Chrome says Safari.
  const browser = /Edg(e|A|iOS)?\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser\//.test(ua)
        ? 'Samsung Internet'
        : /Firefox\/|FxiOS\//.test(ua)
          ? 'Firefox'
          : /Chrome\/|CriOS\//.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : 'Other'

  const device =
    /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))
      ? 'tablet'
      : /Mobi|iPhone|iPod|Android/.test(ua)
        ? 'mobile'
        : 'desktop'

  return { device, browser, os }
}

function campaignKey(source: string, medium: string, campaign: string): string {
  return [source, medium, campaign].map((part) => part || '(none)').join(' / ')
}

export type PageViewInput = {
  path: string
  // The first page of a stay, not one reached by a link within the site, a
  // reload, or the back button.
  entry: boolean
  referrer: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  // The host the request was made to.
  siteHost: string
  country: string
  region: string
  city: string
  userAgent: string
  ip: string
}

// One count going up by a view. Whether the view is also a new visitor is
// asked of the log inside the statement, so that it is answered and counted
// in one step: ?5 says whether this count has visitors at all, and ?8 narrows
// the question to one page.
const UPSERT = `INSERT INTO page_views (kind, key, day, views, visits, visitors)
  SELECT ?1, ?2, ?3, 1, ?4,
    CASE
      WHEN ?5 = 0 THEN 0
      WHEN EXISTS (
        SELECT 1 FROM page_view_log
        WHERE ip = ?6 AND at >= ?7 AND (?8 = '' OR path = ?8)
      ) THEN 0
      ELSE 1
    END
  WHERE true
  ON CONFLICT (kind, key, day) DO UPDATE SET
    views = views + 1,
    visits = visits + excluded.visits,
    visitors = visitors + excluded.visitors`

// Counts one page view. Called behind the visitor by /api/view, which has
// already left out bots and administrators.
export async function recordPageView(view: PageViewInput): Promise<void> {
  const db = getDb()
  const path = await countedPath(db, view.path)
  if (!path) return

  const now = DateTime.now().setZone(SITE_ZONE)
  const day = dayOf(now)
  const dayStart = Math.floor(now.startOf('day').toSeconds())

  const referrer = view.entry
    ? referrerOf(view.referrer, view.siteHost)
    : { host: '', own: true }
  // A visit is a view that arrived from somewhere else, or from nowhere.
  const visit = view.entry && !referrer.own ? 1 : 0

  const utmSource = view.entry ? clean(view.utmSource, MAX_UTM) : ''
  const utmMedium = view.entry ? clean(view.utmMedium, MAX_UTM) : ''
  const utmCampaign = view.entry ? clean(view.utmCampaign, MAX_UTM) : ''
  const hasCampaign = Boolean(utmSource || utmMedium || utmCampaign)

  const country = /^[A-Za-z]{2}$/.test(view.country)
    ? view.country.toUpperCase()
    : ''
  const region = clean(view.region, 100)
  const city = clean(view.city, 100)
  const { device, browser, os } = parseUserAgent(view.userAgent)
  const ip = clean(view.ip, 45)

  // `visitors` is whose first view of the day it may be: the site's, one
  // page's, or nobody's, for the counts that do not keep visitors.
  const count = (
    kind: string,
    key: string,
    visitors: 'site' | 'page' | 'none'
  ): D1Statement =>
    db
      .prepare(UPSERT)
      .bind(
        kind,
        key,
        day,
        visit,
        visitors === 'none' ? 0 : 1,
        ip,
        dayStart,
        visitors === 'page' ? path : ''
      )

  // The total comes first: what it returns says whether this is the day's
  // first view. The log row comes last: the counts before it ask the log
  // whether the visitor has been seen today, and must not find this view.
  const statements = [count('total', '', 'site'), count('path', path, 'page')]
  if (referrer.host) statements.push(count('referrer', referrer.host, 'none'))
  if (hasCampaign) {
    statements.push(
      count('campaign', campaignKey(utmSource, utmMedium, utmCampaign), 'none')
    )
  }
  if (country) statements.push(count('country', country, 'none'))
  statements.push(
    db
      .prepare(
        `INSERT INTO page_view_log
          (at, path, is_visit, referrer, utm_source, utm_medium, utm_campaign,
           country, region, city, device, browser, os, ip)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
      )
      .bind(
        Math.floor(now.toSeconds()),
        path,
        visit,
        referrer.host,
        utmSource,
        utmMedium,
        utmCampaign,
        country,
        region,
        city,
        device,
        browser,
        os,
        ip
      )
  )

  await db.batch(statements)
}

// --- Reading ---

const DAYS_BACK: Partial<Record<ViewPeriod, number>> = {
  '7d': 6,
  '30d': 29,
  '90d': 89,
}

type Counts = {
  views: number | null
  visits: number | null
  visitors: number | null
}
type CountRow = Counts & { bucket: string }
type KeyRow = { key: string; views: number; title?: string | null }
type LogListRow = { a: string; b: string; c: string; views: number }

function toCount(row: Counts | undefined): ViewCount {
  return {
    views: row?.views ?? 0,
    visits: row?.visits ?? 0,
    visitors: row?.visitors ?? 0,
  }
}

// How a page is named in a list: a post by its title, a built-in page by its
// own, an archive by what it lists.
function pageLabel(path: string, title?: string | null): string {
  if (title) return title
  const builtIn = STATIC_PAGES.get(path)
  if (builtIn) return builtIn
  if (path === '/search') return 'Search'
  const archive = path.match(ARCHIVE_PATH)
  if (archive) {
    const kind = archive[1]!
    return `${kind.charAt(0).toUpperCase()}${kind.slice(1)}: ${archive[2]}`
  }
  return path
}

function pageHref(path: string): string {
  return path === '/' ? '/' : `${path}/`
}

function byKey(rows: KeyRow[]): ViewListRow[] {
  return rows.map((row) => ({ key: row.key, label: row.key, views: row.views }))
}

// The pages that list posts rather than being one: a category, a tag, an
// author, the search. The same paths ARCHIVE_PATH matches, for SQL, on the
// column named.
const isArchive = (column: string): string =>
  `(${column} LIKE '/category/%' OR ${column} LIKE '/tag/%'
  OR ${column} LIKE '/author/%' OR ${column} = '/search')`

const HOUR = 3600

// The views between two days, for the whole site or for one page: the bars of
// the chart, the numbers under it, and the lists below those. `bucket` is a
// bar that was pressed, and narrows the lists to that hour, day or month.
// Today and yesterday are shown by the hour, which only the log knows, so
// their bars and lists are read from the log rather than the counts.
export async function readPageViews(input: {
  period: ViewPeriod
  bucket?: string
  path?: string
}): Promise<PageViewReport> {
  const db = getDb()
  const path = input.path ? normalizePostUrl(input.path) || '/' : ''
  const kind = path ? 'path' : 'total'
  const now = today()
  const moment = DateTime.now().setZone(SITE_ZONE)

  const hourly = input.period === 'today' || input.period === 'yesterday'
  const daysBack = DAYS_BACK[input.period]
  const unit: PageViewReport['unit'] = hourly
    ? 'hour'
    : daysBack === undefined
      ? 'month'
      : 'day'

  let from: DateTime
  // The same length of time just before the period, to compare it with.
  let before: DateTime | null
  if (hourly) {
    from = input.period === 'today' ? now : now.minus({ days: 1 })
    before = from.minus({ days: 1 })
  } else if (daysBack !== undefined) {
    from = now.minus({ days: daysBack })
    before = from.minus({ days: daysBack + 1 })
  } else if (input.period === '12m') {
    from = now.startOf('month').minus({ months: 11 })
    before = from.minus({ months: 12 })
  } else {
    const first = await db
      .prepare(
        'SELECT MIN(day) AS day FROM page_views WHERE kind = ?1 AND key = ?2'
      )
      .bind(kind, path)
      .first<{ day: string | null }>()
    const firstDay = first?.day
      ? DateTime.fromISO(first.day, { zone: SITE_ZONE })
      : now
    from = (firstDay.isValid ? firstDay : now).startOf('month')
    before = null
  }
  // Where the hours end: this moment for today, midnight for yesterday. The
  // chart's last bar is the hour that holds it.
  const until = input.period === 'today' ? moment : from.plus({ days: 1 })

  const bucketForm =
    unit === 'hour'
      ? /^\d{4}-\d{2}-\d{2}T\d{2}$/
      : unit === 'day'
        ? /^\d{4}-\d{2}-\d{2}$/
        : /^\d{4}-\d{2}$/
  const pressed =
    input.bucket && bucketForm.test(input.bucket)
      ? DateTime.fromISO(input.bucket, { zone: SITE_ZONE })
      : null

  // What the lists cover: the whole period, or the one bar pressed. The log
  // is asked by the second, the counts by the day.
  let listFrom = from
  let listTo = hourly ? from : now
  let logFrom: number
  let logTo: number
  if (hourly) {
    const hour =
      pressed?.isValid && pressed >= from && pressed < until ? pressed : null
    logFrom = Math.floor((hour ?? from).toSeconds())
    logTo = Math.floor((hour ? hour.plus({ hours: 1 }) : until).toSeconds()) - 1
  } else {
    if (pressed?.isValid) {
      listFrom = DateTime.max(from, pressed.startOf(unit))
      listTo = DateTime.min(now, pressed.endOf(unit).startOf('day'))
    }
    logFrom = Math.floor(listFrom.startOf('day').toSeconds())
    logTo = Math.floor(listTo.endOf('day').toSeconds())
  }

  const statements: D1Statement[] = []
  // Adds a statement to the one batch, and says where its rows will be.
  const ask = (statement: D1Statement): number => statements.push(statement) - 1

  const sums =
    'SUM(views) AS views, SUM(visits) AS visits, SUM(visitors) AS visitors'
  const counted = (listKind: string): number =>
    ask(
      db
        .prepare(
          `SELECT key, SUM(views) AS views FROM page_views
           WHERE kind = ?1 AND day BETWEEN ?2 AND ?3
           GROUP BY key ORDER BY views DESC, key LIMIT ${LIST_LENGTH}`
        )
        .bind(listKind, dayOf(listFrom), dayOf(listTo))
    )
  const viewed = (which: string): number =>
    ask(
      db
        .prepare(
          `SELECT v.key AS key, SUM(v.views) AS views,
                  COALESCE(p.title, g.title) AS title
           FROM page_views v LEFT JOIN posts p ON p.url = v.key
             LEFT JOIN pages g ON g.path = v.key
           WHERE v.kind = 'path' AND v.day BETWEEN ?1 AND ?2 AND ${which}
           GROUP BY v.key ORDER BY views DESC, v.key LIMIT ${LIST_LENGTH}`
        )
        .bind(dayOf(listFrom), dayOf(listTo))
    )
  // The same list from the log, which an hour needs: a day's counts cannot
  // be cut to one hour.
  const viewedInLog = (which: string): number =>
    ask(
      db
        .prepare(
          `SELECT l.path AS key, COUNT(*) AS views,
                  COALESCE(p.title, g.title) AS title
           FROM page_view_log l LEFT JOIN posts p ON p.url = l.path
             LEFT JOIN pages g ON g.path = l.path
           WHERE l.at BETWEEN ?1 AND ?2 AND ${which}
           GROUP BY l.path ORDER BY views DESC, l.path LIMIT ${LIST_LENGTH}`
        )
        .bind(logFrom, logTo)
    )
  // A list read from the log, which has what the counts do not: regions,
  // cities and devices for the site, everything for one page, and anything
  // by the hour.
  const logged = (columns: [string, string, string], present: string): number =>
    ask(
      db
        .prepare(
          `SELECT ${columns[0]} AS a, ${columns[1]} AS b, ${columns[2]} AS c, COUNT(*) AS views
           FROM page_view_log
           WHERE at BETWEEN ?1 AND ?2 AND (?3 = '' OR path = ?3) AND ${present}
           GROUP BY a, b, c ORDER BY views DESC, a LIMIT ${LIST_LENGTH}`
        )
        .bind(logFrom, logTo, path)
    )

  // The bars. By the day or month they are the counts; by the hour they are
  // the log, counted from the day's midnight, in two statements: the views
  // and visits of each hour, and the visitors first seen in it (how the day's
  // visitors are counted, so the hours add up to the day).
  const start = Math.floor(from.toSeconds())
  const end = Math.floor(until.toSeconds())
  const bucketOf = unit === 'day' ? 'day' : 'substr(day, 1, 7)'
  const series = hourly
    ? null
    : ask(
        db
          .prepare(
            `SELECT ${bucketOf} AS bucket, ${sums}
             FROM page_views WHERE kind = ?1 AND key = ?2 AND day BETWEEN ?3 AND ?4
             GROUP BY bucket`
          )
          .bind(kind, path, dayOf(from), dayOf(now))
      )
  const hours = hourly
    ? ask(
        db
          .prepare(
            `SELECT (at - ?1) / ${HOUR} AS bucket, COUNT(*) AS views, SUM(is_visit) AS visits
             FROM page_view_log
             WHERE at >= ?1 AND at < ?2 AND (?3 = '' OR path = ?3)
             GROUP BY bucket`
          )
          .bind(start, end, path)
      )
    : null
  const hourVisitors = hourly
    ? ask(
        db
          .prepare(
            `SELECT (first - ?1) / ${HOUR} AS bucket, COUNT(*) AS visitors
             FROM (SELECT MIN(at) AS first FROM page_view_log
                   WHERE at >= ?1 AND at < ?2 AND (?3 = '' OR path = ?3)
                   GROUP BY ip)
             GROUP BY bucket`
          )
          .bind(start, end, path)
      )
    : null
  const todays = ask(
    db
      .prepare(
        'SELECT views, visits, visitors FROM page_views WHERE kind = ?1 AND key = ?2 AND day = ?3'
      )
      .bind(kind, path, dayOf(now))
  )
  const allTime = ask(
    db
      .prepare(`SELECT ${sums} FROM page_views WHERE kind = ?1 AND key = ?2`)
      .bind(kind, path)
  )
  // The time before: for the hours, the same hours of the day before (up to
  // this time of day, for today), from the log.
  let previous: number | null = null
  if (hourly && before) {
    previous = ask(
      db
        .prepare(
          `SELECT COUNT(*) AS views, SUM(is_visit) AS visits, COUNT(DISTINCT ip) AS visitors
           FROM page_view_log
           WHERE at >= ?1 AND at < ?2 AND (?3 = '' OR path = ?3)`
        )
        .bind(
          Math.floor(before.toSeconds()),
          Math.floor(until.minus({ days: 1 }).toSeconds()),
          path
        )
    )
  } else if (before) {
    previous = ask(
      db
        .prepare(
          `SELECT ${sums} FROM page_views
           WHERE kind = ?1 AND key = ?2 AND day >= ?3 AND day < ?4`
        )
        .bind(kind, path, dayOf(before), dayOf(from))
    )
  }
  const bestDay = ask(
    db
      .prepare(
        `SELECT day, views FROM page_views WHERE kind = ?1 AND key = ?2
         ORDER BY views DESC, day DESC LIMIT 1`
      )
      .bind(kind, path)
  )
  // The posts published in each day or hour shown. A post's date is already
  // in the site's own time, as 2026-10-08T14:00:00, so its first 13 letters
  // are the hour's key and its first 10 the day's.
  const published =
    unit !== 'month' && !path
      ? ask(
          db
            .prepare(
              `SELECT substr(date, 1, ${hourly ? 13 : 10}) AS day, title FROM posts
               WHERE date >= ?1 AND date < ?2 ORDER BY date`
            )
            .bind(dayOf(from), dayOf((hourly ? from : now).plus({ days: 1 })))
        )
      : null

  // Whether the lists come from the log: one page's always do, and so do an
  // hour's.
  const inLog = Boolean(path) || hourly
  const pages = path
    ? null
    : hourly
      ? viewedInLog(`NOT ${isArchive('l.path')}`)
      : viewed(`NOT ${isArchive('v.key')}`)
  const archives = path
    ? null
    : hourly
      ? viewedInLog(isArchive('l.path'))
      : viewed(isArchive('v.key'))
  const referrers = inLog
    ? logged(['referrer', "''", "''"], "referrer != ''")
    : counted('referrer')
  const campaigns = inLog
    ? logged(
        ['utm_source', 'utm_medium', 'utm_campaign'],
        "(utm_source != '' OR utm_medium != '' OR utm_campaign != '')"
      )
    : counted('campaign')
  const countries = inLog
    ? logged(['country', "''", "''"], "country != ''")
    : counted('country')
  const regions = logged(['region', 'country', "''"], "region != ''")
  const cities = logged(['city', 'region', 'country'], "city != ''")
  const devices = logged(['browser', 'os', 'device'], "browser != ''")
  // When the log begins: the counts may go back further (the history before
  // the site counted for itself has no log).
  const logStart = ask(db.prepare('SELECT MIN(at) AS at FROM page_view_log'))

  const results = await db.batch(statements)
  const rows = <T>(index: number | null) =>
    (index === null ? [] : (results[index]?.results ?? [])) as T[]

  const titles = new Map<string, string[]>()
  for (const post of rows<{ day: string; title: string }>(published)) {
    titles.set(post.day, [...(titles.get(post.day) ?? []), post.title])
  }

  const format =
    unit === 'hour'
      ? "yyyy-MM-dd'T'HH"
      : unit === 'day'
        ? 'yyyy-MM-dd'
        : 'yyyy-MM'
  // The counts of each bar, by its key. An hour's key is its wall-clock
  // hour, so the hour that comes twice when the clocks go back is one bar.
  const filled = new Map<string, ViewCount>()
  const add = (key: string, count: Partial<Counts>) => {
    const had = filled.get(key) ?? { views: 0, visits: 0, visitors: 0 }
    filled.set(key, {
      views: had.views + (count.views ?? 0),
      visits: had.visits + (count.visits ?? 0),
      visitors: had.visitors + (count.visitors ?? 0),
    })
  }
  const hourKey = (index: number) =>
    DateTime.fromSeconds(start + index * HOUR, { zone: SITE_ZONE }).toFormat(
      format
    )
  for (const row of rows<CountRow>(series)) add(row.bucket, row)
  for (const row of rows<{ bucket: number; views: number; visits: number }>(
    hours
  )) {
    add(hourKey(row.bucket), { views: row.views, visits: row.visits })
  }
  for (const row of rows<{ bucket: number; visitors: number }>(hourVisitors)) {
    add(hourKey(row.bucket), { visitors: row.visitors })
  }

  const buckets: ViewBucket[] = []
  const step =
    unit === 'hour'
      ? { hours: 1 }
      : unit === 'day'
        ? { days: 1 }
        : { months: 1 }
  for (
    let at = from.startOf(unit);
    hourly ? at < until : at <= now;
    at = at.plus(step)
  ) {
    const key = at.toFormat(format)
    if (buckets[buckets.length - 1]?.key === key) continue
    const posts = titles.get(key)
    buckets.push({
      key,
      ...toCount(filled.get(key)),
      ...(posts ? { published: posts } : {}),
    })
  }
  const total = (measure: keyof ViewCount) =>
    buckets.reduce((sum, bucket) => sum + bucket[measure], 0)

  const best = rows<{ day: string; views: number }>(bestDay)[0]
  const firstLogged = rows<{ at: number | null }>(logStart)[0]?.at
  const logBegins =
    typeof firstLogged === 'number'
      ? DateTime.fromSeconds(firstLogged, { zone: SITE_ZONE }).startOf('day')
      : null
  const pageRows = (index: number | null): ViewListRow[] =>
    rows<KeyRow>(index).map((row) => ({
      key: row.key,
      label: pageLabel(row.key, row.title),
      href: pageHref(row.key),
      views: row.views,
    }))
  const logRows = (index: number): ViewListRow[] =>
    rows<LogListRow>(index).map((row) => ({
      key: row.a,
      label: row.a,
      views: row.views,
    }))

  return {
    period: input.period,
    unit,
    buckets,
    today: toCount(rows<Counts>(todays)[0]),
    inPeriod: {
      views: total('views'),
      visits: total('visits'),
      visitors: total('visitors'),
    },
    previous: previous === null ? null : toCount(rows<Counts>(previous)[0]),
    allTime: toCount(rows<Counts>(allTime)[0]),
    bestDay:
      best && best.views > 0 ? { day: best.day, views: best.views } : null,
    pages: pageRows(pages),
    archives: pageRows(archives),
    referrers: inLog ? logRows(referrers) : byKey(rows<KeyRow>(referrers)),
    campaigns: inLog
      ? rows<LogListRow>(campaigns).map((row) => {
          const label = campaignKey(row.a, row.b, row.c)
          return { key: label, label, views: row.views }
        })
      : byKey(rows<KeyRow>(campaigns)),
    countries: (inLog
      ? logRows(countries)
      : byKey(rows<KeyRow>(countries))
    ).map((row) => ({
      ...row,
      country: row.key,
    })),
    regions: rows<LogListRow>(regions).map((row) => ({
      key: `${row.a}|${row.b}`,
      label: row.a,
      country: row.b,
      views: row.views,
    })),
    cities: rows<LogListRow>(cities).map((row) => ({
      key: `${row.a}|${row.b}|${row.c}`,
      label: [row.a, row.b].filter(Boolean).join(', '),
      country: row.c,
      views: row.views,
    })),
    devices: rows<LogListRow>(devices).map((row) => {
      const label = `${row.a} on ${row.b} · ${row.c}`
      return { key: label, label, views: row.views }
    }),
    logCutShort: logBegins !== null && listFrom < logBegins,
  }
}

// The site's visits (arrivals from outside) between two Unix times, `to` not
// included, by the days they fall on: what FlowTrace measures its
// conversions against, from the same counts Analytics shows.
export async function readSiteVisits(from: number, to: number): Promise<number> {
  const first = dayOf(DateTime.fromSeconds(from, { zone: SITE_ZONE }))
  const last = dayOf(DateTime.fromSeconds(Math.max(from, to - 1), { zone: SITE_ZONE }))
  const row = await getDb()
    .prepare(
      `SELECT SUM(visits) AS visits FROM page_views
       WHERE kind = 'total' AND key = '' AND day BETWEEN ?1 AND ?2`
    )
    .bind(first, last)
    .first<{ visits: number | null }>()
  return row?.visits ?? 0
}

// Two numbers each for the toolbar: the site's today (midnight to midnight
// by the site's clock, so the figure starts over each day), and all time for
// the page when `path` is a page the site counts. A page's all-time sum
// reads its own rows alone (one a day it was viewed) by the primary key.
export async function readLiveCounts(input: {
  path?: string
}): Promise<LiveCounts> {
  const db = getDb()
  const now = today()
  const day = dayOf(now)
  const path = input.path ? await countedPath(db, input.path) : null

  const sums =
    'SUM(views) AS views, SUM(visits) AS visits, SUM(visitors) AS visitors'
  const statements = [
    db
      .prepare(
        `SELECT ${sums} FROM page_views
         WHERE kind = ?1 AND key = ?2 AND day = ?3`
      )
      .bind('total', '', day),
  ]
  if (path !== null) {
    statements.push(
      db
        .prepare(`SELECT ${sums} FROM page_views WHERE kind = ?1 AND key = ?2`)
        .bind('path', path)
    )
  }
  const results = await db.batch<Counts>(statements)

  return {
    from: day,
    to: day,
    site: toCount(results[0]?.results[0]),
    page: path !== null ? toCount(results[1]?.results[0]) : null,
  }
}

type LogRow = {
  id: number
  at: number
  path: string
  title: string | null
  is_visit: number
  referrer: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  country: string
  region: string
  city: string
  device: string
  browser: string
  os: string
  ip: string
}

// One page of the log, newest first. `ip` and `path` each narrow it to one
// address or one page; `search` finds either by a part of it.
export async function readVisitLog(input: {
  page: number
  ip?: string
  path?: string
  search?: string
}): Promise<VisitLogPage> {
  const db = getDb()
  const ip = clean(input.ip ?? '', 45)
  const path = input.path ? normalizePostUrl(input.path) || '/' : ''
  const search = clean(input.search ?? '', 100).replace(/[\\%_]/g, '\\$&')
  const like = search ? `%${search}%` : ''

  const where = `(?1 = '' OR l.ip = ?1) AND (?2 = '' OR l.path = ?2)
    AND (?3 = '' OR l.ip LIKE ?3 ESCAPE '\\' OR l.path LIKE ?3 ESCAPE '\\')`

  const [found, count] = await db.batch([
    db
      .prepare(
        `SELECT l.id, l.at, l.path, COALESCE(p.title, g.title) AS title,
                l.is_visit, l.referrer, l.utm_source,
                l.utm_medium, l.utm_campaign, l.country, l.region, l.city,
                l.device, l.browser, l.os, l.ip
         FROM page_view_log l LEFT JOIN posts p ON p.url = l.path
           LEFT JOIN pages g ON g.path = l.path
         WHERE ${where}
         ORDER BY l.at DESC, l.id DESC LIMIT ?4 OFFSET ?5`
      )
      .bind(
        ip,
        path,
        like,
        VISITS_PER_PAGE,
        (input.page - 1) * VISITS_PER_PAGE
      ),
    db
      .prepare(`SELECT COUNT(*) AS total FROM page_view_log l WHERE ${where}`)
      .bind(ip, path, like),
  ])

  const total = ((count?.results[0] as { total?: number } | undefined)?.total ??
    0) as number
  const rows: VisitRow[] = ((found?.results ?? []) as LogRow[]).map((row) => ({
    id: row.id,
    at: row.at,
    path: pageHref(row.path),
    title: pageLabel(row.path, row.title),
    isVisit: row.is_visit === 1,
    referrer: row.referrer,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    country: row.country,
    region: row.region,
    city: row.city,
    device: row.device,
    browser: row.browser,
    os: row.os,
    ip: row.ip,
  }))

  return {
    rows,
    total,
    page: input.page,
    pages: Math.max(1, Math.ceil(total / VISITS_PER_PAGE)),
  }
}
