import { DateTime } from 'luxon'
import { flowTraceConfig } from '@/utils/flow-trace-config'
import type {
  FtConversion,
  FtEventType,
  FtVisit,
} from '@/utils/flow-trace-types'

// How FlowTrace's numbers and facts read, the same in the FlowTrace box and
// in the emails. No server-only import: the scheduled job in worker.ts uses it.

/** A Unix time on the site's clock. */
export function siteTime(seconds: number): DateTime {
  return DateTime.fromSeconds(seconds, { zone: flowTraceConfig.zone })
}

/** "Oct 13, 2:05 PM" */
export function formatWhen(seconds: number): string {
  return siteTime(seconds).toFormat('LLL d, h:mm a')
}

/** "2:05:31 PM" */
export function formatClock(seconds: number): string {
  return siteTime(seconds).toFormat('h:mm:ss a')
}

/** "45s", "3 min 5s", "1 hr 12 min" */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours) return `${hours} hr${minutes ? ` ${minutes} min` : ''}`
  if (minutes) return `${minutes} min${seconds ? ` ${seconds}s` : ''}`
  return `${seconds}s`
}

// Hosts people know by name. Matched on the end of the host, so
// l.facebook.com is Facebook and google.co.uk is Google.
const KNOWN_SOURCES: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$/, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)yahoo\.[a-z.]+$/, 'Yahoo'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)facebook\.com$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)x\.com$|^t\.co$|(^|\.)twitter\.com$/, 'X (Twitter)'],
  [/^news\.ycombinator\.com$/, 'Hacker News'],
  [/(^|\.)reddit\.com$/, 'Reddit'],
  [/(^|\.)chatgpt\.com$/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$/, 'Perplexity'],
  [/^com\.google\.android\.gm$/, 'Gmail app'],
  [/^com\.google\.android\.googlequicksearchbox$/, 'Google app'],
]

/** A referrer host by the name people know it by, or as it is. */
export function sourceName(host: string): string {
  return KNOWN_SOURCES.find(([pattern]) => pattern.test(host))?.[1] ?? host
}

/** Where a visit came from: its campaign, the site that sent it, or Direct. */
export function sourceOf(visit: FtVisit): string {
  if (visit.utmSource) {
    return [visit.utmSource, visit.utmMedium].filter(Boolean).join(' / ')
  }
  return visit.referrer ? sourceName(visit.referrer) : 'Direct'
}

/** "Austin, TX" in the US, "Toronto, ON, CA" elsewhere. */
export function placeOf(visit: FtVisit): string {
  const parts = [visit.city, visit.region]
  if (visit.country && visit.country !== 'US') parts.push(visit.country)
  return parts.filter(Boolean).join(', ') || visit.country || 'Unknown'
}

/** "Chrome on iOS · mobile" */
export function deviceOf(visit: FtVisit): string {
  if (!visit.browser) return 'Unknown'
  return `${visit.browser} on ${visit.os} · ${visit.device}`
}

/** How long the visit lasted, first event to last. */
export function visitLength(visit: FtVisit): string {
  return formatDuration((visit.lastAt - visit.startedAt) * 1000)
}

export function conversionLabel(type: FtEventType | string): string {
  return (
    flowTraceConfig.conversionLabels[type as FtConversion] ??
    (type === 'pageview' ? 'Page' : type)
  )
}

/** "1st visit", "3rd visit" */
export function visitOrdinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ||
        'th'
  return `${n}${suffix} visit`
}

/** One line that says what a visit was: "Newsletter sign-up · Google · Austin, TX" */
export function visitHeadline(visit: FtVisit): string {
  return [
    visit.firstConversion ? conversionLabel(visit.firstConversion) : null,
    sourceOf(visit),
    placeOf(visit),
  ]
    .filter(Boolean)
    .join(' · ')
}
