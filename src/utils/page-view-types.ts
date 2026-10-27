// What the Analytics box is sent. Shared by the routes under /api/analytics
// and the components that show them.

export const VIEW_PERIODS = [
  'today',
  'yesterday',
  '7d',
  '30d',
  '90d',
  '12m',
  'all',
] as const
export type ViewPeriod = (typeof VIEW_PERIODS)[number]

// Views are pages looked at. Visits are arrivals from outside the site.
// Visitors are the different people the views came from, by IP address, each
// day's counted afresh.
export type ViewCount = { views: number; visits: number; visitors: number }

// One bar of the chart: an hour (2026-10-06T14), a day (2026-10-06) or a
// month (2026-10). `published` is the titles of the posts published then.
export type ViewBucket = ViewCount & { key: string; published?: string[] }

// One line of a list. `key` is what was counted, as stored; `label` is how
// to show it. `href` is set when it is a page of this site, and `country`
// (two letters) when it is a place.
export type ViewListRow = {
  key: string
  label: string
  href?: string
  country?: string
  views: number
}

export type PageViewReport = {
  period: ViewPeriod
  unit: 'hour' | 'day' | 'month'
  buckets: ViewBucket[]
  today: ViewCount
  inPeriod: ViewCount
  // The same length of time just before the period. Null for all time,
  // which has nothing before it.
  previous: ViewCount | null
  allTime: ViewCount
  bestDay: { day: string; views: number } | null
  // Posts and built-in pages, then the pages that list posts (a category, a
  // tag, an author, the search). Both empty when the report is one page's.
  pages: ViewListRow[]
  archives: ViewListRow[]
  referrers: ViewListRow[]
  campaigns: ViewListRow[]
  countries: ViewListRow[]
  regions: ViewListRow[]
  cities: ViewListRow[]
  devices: ViewListRow[]
  // The lists that are read from the log only go back to the first view the
  // site logged; the counts may go back further (the history imported from
  // Jetpack has no log). True when the period asked for begins before the log.
  logCutShort: boolean
}

export type VisitRow = {
  id: number
  at: number
  path: string
  title: string
  isVisit: boolean
  referrer: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  country: string
  region: string
  city: string
  device: string
  browser: string
  os: string
  ip: string
}

// What the admin toolbar shows: the site's today (`from` and `to` are both
// that day) and the page's all time. `page` is null when the path is not a
// page the site counts.
export type LiveCounts = {
  from: string
  to: string
  site: ViewCount
  page: ViewCount | null
}

export type VisitLogPage = {
  rows: VisitRow[]
  total: number
  page: number
  pages: number
}
