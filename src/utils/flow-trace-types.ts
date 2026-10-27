// FlowTrace's shapes, shared by the browser (src/hooks/flow-trace.tsx), the
// endpoint, the FlowTrace box and the emails. Nothing here runs on its own.

/** A step of a visit: a page seen, or a conversion. */
export const FT_EVENT_TYPES = [
  'pageview',
  'form',
  'newsletter',
  'signup',
  'email',
  'call',
  'click',
] as const
export type FtEventType = (typeof FT_EVENT_TYPES)[number]

/** The events that make a visit worth a report. */
export const FT_CONVERSIONS = [
  'form',
  'newsletter',
  'signup',
  'email',
  'call',
  'click',
] as const
export type FtConversion = (typeof FT_CONVERSIONS)[number]

/** Which emails a person gets: none, one per converting visit, or a summary. */
export const FT_EMAIL_MODES = ['off', 'instant', 'daily', 'weekly'] as const
export type FtEmailMode = (typeof FT_EMAIL_MODES)[number]

export type FtUtm = Partial<
  Record<'source' | 'medium' | 'campaign' | 'term' | 'content', string>
>

/** One step of the journey as the browser keeps it. `at` is its own clock. */
export type FtStep = {
  t: FtEventType
  /** Path with its query */
  p: string
  /** Page title */
  ti?: string
  /** Milliseconds, the browser's clock */
  at: number
  /** For a page: how long it was in front of them */
  ms?: number
  /** For a conversion: what was clicked or sent */
  l?: string
  href?: string
}

/**
 * What the browser sends when a visit converts: the whole journey so far.
 * Sent again, whole, on each later conversion in the same visit.
 */
export type FtPayload = {
  /** Visitor id, kept in the browser */
  v: string
  /** Visit id */
  s: string
  /** The visitor's how-manyth visit, as the browser counts */
  n: number
  /** When the browser first visited (ms, its clock) */
  fs: number
  /** Time on the site over all visits, this one included */
  tt: number
  /** document.referrer on arrival */
  r?: string
  u?: FtUtm
  /** The browser's clock when it sent this, to line the steps up */
  now: number
  steps: FtStep[]
}

export type FtVisit = {
  id: string
  visitorId: string
  visitNumber: number
  startedAt: number
  lastAt: number
  entryPath: string
  referrer: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  country: string
  region: string
  city: string
  device: string
  browser: string
  os: string
  ip: string
  pageviews: number
  engagedMs: number
  conversions: number
  firstConversion: string
  /** When the visit's report was settled: sent, or not to be sent */
  reportedAt: number | null
  reportStatus: FtReportStatus
  /** When the visitor first came to the site, as their browser says */
  firstSeen: number | null
  /** Their time on the site across all visits, this one included */
  visitorEngagedMs: number
}

/**
 * Where a visit's report email stands. waiting: not sent yet, or it failed
 * and the scheduled job tries again; sent: it went to at least one person;
 * failed: it could not be sent within the retry time; capped: past the
 * hourly limit, so not emailed; nobody: no one gets instant reports.
 */
export const FT_REPORT_STATUSES = [
  'waiting',
  'sent',
  'failed',
  'capped',
  'nobody',
] as const
export type FtReportStatus = (typeof FT_REPORT_STATUSES)[number]

/** One attempt to email a visit's report to one person. */
export type FtReportSend = {
  email: string
  at: number
  ok: boolean
  /** Why it did not go, when it did not: Cloudflare's code */
  error: string
}

export type FtEvent = {
  id: number
  at: number
  type: FtEventType
  path: string
  title: string
  label: string
  href: string
  engagedMs: number
}

/** A visit with everything that happened on it and the visitor's history. */
export type FtVisitReport = {
  visit: FtVisit
  events: FtEvent[]
  /** The visitor's other converted visits, newest first */
  otherVisits: FtVisit[]
  /** Every attempt to email its report, newest first */
  sends: FtReportSend[]
}

/** A line of a list, as the analytics lists show it (ViewList). */
export type FtListRow = {
  key: string
  label: string
  views: number
  href?: string
  country?: string
}

/** How many converted visits, and how many of each conversion. */
export type FtCounts = {
  converted: number
  conversions: Record<FtConversion, number>
}

/** The converted visits in a stretch of time: the box's and the summaries'. */
export type FtSummary = FtCounts & {
  from: number
  to: number
  /**
   * The site's visits in the same time, as Analytics counts them
   * (src/utils/page-views.ts): what the conversions are measured against.
   * Null where they are not known (the scheduled job's summaries).
   */
  visits: number | null
  sources: FtListRow[]
  /** The pages seen on those visits */
  pages: FtListRow[]
  countries: FtListRow[]
  regions: FtListRow[]
  cities: FtListRow[]
  devices: FtListRow[]
  convertedVisits: FtVisit[]
}

export type FtVisitPage = {
  rows: FtVisit[]
  total: number
  page: number
  pages: number
}

/** What the FlowTrace box's Overview reads: a period, and the one before. */
export type FtOverview = {
  period: string
  summary: FtSummary
  before: (FtCounts & { visits: number | null }) | null
}

/** The FlowTrace box's Email settings. */
export type FtSettings = {
  // The administrator's own address, from WordPress
  email: string | null
  // Whether that address is on FLOWTRACE_EMAILS (or EMAIL_TO), and so is
  // emailed and may choose
  recipient: boolean
  mode: FtEmailMode
  team: { email: string; mode: FtEmailMode }[]
}
