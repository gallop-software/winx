import { flowTraceConfig } from '@/utils/flow-trace-config'
import {
  conversionLabel,
  deviceOf,
  formatClock,
  formatDuration,
  formatWhen,
  placeOf,
  siteTime,
  sourceName,
  sourceOf,
  visitHeadline,
  visitLength,
  visitOrdinal,
} from '@/utils/flow-trace-format'
import type {
  FtSummary,
  FtVisit,
  FtVisitReport,
} from '@/utils/flow-trace-types'

// The FlowTrace emails: a report on one visit that converted, and the daily
// and weekly summaries. A report holds the whole visit, so it can be read
// without opening the site; each one links to the same report in the
// FlowTrace box. No server-only import: the scheduled job in worker.ts sends
// them. Everything a visitor's browser sent is escaped before it is put in.

export type FtEmail = { subject: string; html: string; text: string }

// Where the links point and what the site is called, handed in rather than
// read here: the endpoint passes the site's own, the scheduled job its
// Worker's environment.
export type FtSite = { url: string; name: string }

// Mail programs follow inline styles only, hence the hex colors: the site's
// navy and its light tint.
const colors = {
  page: '#f6f7fb',
  card: '#ffffff',
  text: '#0b1833',
  muted: '#6b7592',
  rule: '#e3e6ef',
  tint: '#eef1f8',
  accent: '#142a66',
  accentText: '#faf8f3',
}

const FONT = "'Arial', 'Helvetica', sans-serif"

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function siteUrl(site: FtSite, path: string): string {
  return `${site.url.replace(/\/+$/, '')}${path}`
}

/** The visit's report in the FlowTrace box, which opens it for an administrator. */
export function visitUrl(site: FtSite, id: string): string {
  return siteUrl(site, `/?flowtrace=${encodeURIComponent(`visit-${id}`)}`)
}

// The subject holds only what a visitor cannot choose: the kind of
// conversion and where Cloudflare places them. Where they came from (a
// referrer or a campaign tag, anyone can send those) is in the body, escaped.
function subjectOf(visit: FtVisit): string {
  return [
    visit.firstConversion ? conversionLabel(visit.firstConversion) : 'Visit',
    placeOf(visit),
  ].join(' · ')
}

function button(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 28px;background:${colors.accent};color:${colors.accentText};border-radius:6px;font-size:15px;font-weight:700;text-decoration:none">${escapeHtml(label)}</a>`
}

function layout(site: FtSite, body: string): string {
  const settings = siteUrl(site, '/?flowtrace=settings')
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><meta name="color-scheme" content="light" /></head>
<body style="margin:0;padding:0;background:${colors.page};font-family:${FONT};color:${colors.text}">
  <div style="padding:40px 15px;text-align:center">
    <div style="display:inline-block;max-width:560px;width:100%;text-align:left">
      ${body}
      <p style="margin:32px 0 0;font-size:13px;line-height:1.5;color:${colors.muted}">You get this because FlowTrace emails are on for you at ${escapeHtml(site.name)}. <a href="${escapeHtml(settings)}" style="color:${colors.muted}">Change which FlowTrace emails you get</a>.</p>
    </div>
  </div>
</body>
</html>`
}

const divider = (index: number) =>
  index ? `border-top:1px solid ${colors.rule};` : ''

function box(inner: string): string {
  return `<div style="background:${colors.card};border:1px solid ${colors.rule};border-radius:10px;padding:16px 20px">${inner}</div>`
}

function section(title: string, inner: string): string {
  return `<h3 style="margin:28px 0 10px;font-size:16px">${escapeHtml(title)}</h3>${inner}`
}

function factRows(rows: [string, string][]): string {
  return rows
    .filter(([, value]) => value)
    .map(
      ([key, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:${colors.muted};font-size:14px;white-space:nowrap;vertical-align:top">${escapeHtml(key)}</td><td style="padding:6px 0;font-size:15px">${escapeHtml(value)}</td></tr>`
    )
    .join('')
}

function eyebrow(site: FtSite): string {
  return `<p style="margin:0 0 4px;font-size:13px;color:${colors.muted};text-transform:uppercase;letter-spacing:1px">FlowTrace · ${escapeHtml(site.name)}</p>`
}

/** The report on one visit: who, from where, and every step they took. */
export function renderVisitEmail(report: FtVisitReport, site: FtSite): FtEmail {
  const { visit } = report
  // Most recent first: what they did last, the conversion, on top
  const events = [...report.events].reverse()
  const campaign = [visit.utmCampaign, visit.utmTerm, visit.utmContent]
    .filter(Boolean)
    .join(' / ')
  const converted = events.find((event) => event.type !== 'pageview')

  const facts = factRows([
    ['When', formatWhen(visit.startedAt)],
    ['Came from', sourceOf(visit)],
    ['Campaign', campaign],
    ['Where', placeOf(visit)],
    ['Device', deviceOf(visit)],
    [
      'Visit',
      visit.visitNumber > 1
        ? `${visitOrdinal(visit.visitNumber)}${visit.firstSeen ? ` · first seen ${formatWhen(visit.firstSeen)}` : ''}`
        : 'First visit',
    ],
    [
      'Time on site',
      `${formatDuration(visit.engagedMs)} reading, over ${visitLength(visit)}`,
    ],
    [
      'Across all visits',
      visit.visitNumber > 1 ? formatDuration(visit.visitorEngagedMs) : '',
    ],
    ['IP address', visit.ip],
  ])

  const steps = events
    .map((event, index) => {
      const isPage = event.type === 'pageview'
      const what = isPage
        ? `<a href="${escapeHtml(siteUrl(site, event.path))}" style="color:inherit">${escapeHtml(event.title || event.path)}</a><br /><span style="color:${colors.muted};font-size:13px">${escapeHtml(event.path)}${event.engagedMs ? ` · ${formatDuration(event.engagedMs)} on the page` : ''}</span>`
        : `<strong>${escapeHtml(conversionLabel(event.type))}</strong>${event.label ? `: ${escapeHtml(event.label)}` : ''}<br /><span style="color:${colors.muted};font-size:13px">on ${escapeHtml(event.path)}</span>`
      return `<tr><td style="padding:8px 12px 8px 8px;color:${colors.muted};font-size:13px;white-space:nowrap;vertical-align:top;${divider(index)}${isPage ? '' : `background:${colors.tint}`}">${formatClock(event.at)}</td><td style="padding:8px 8px 8px 0;font-size:15px;line-height:1.4;${divider(index)}${isPage ? '' : `background:${colors.tint}`}">${what}</td></tr>`
    })
    .join('')

  const headline = visitHeadline(visit)
  const html = layout(
    site,
    `${eyebrow(site)}
      <h2 style="margin:0 0 20px;font-size:22px;line-height:1.3">${escapeHtml(headline)}</h2>
      ${box(`<table style="border-collapse:collapse;width:100%">${facts}</table>`)}
      ${section('What they did, latest first', box(`<table style="border-collapse:collapse;width:100%">${steps}</table>`))}
      <p style="margin:28px 0 0;text-align:center">${button(visitUrl(site, visit.id), 'Open in FlowTrace')}</p>
      ${converted ? `<p style="margin:12px 0 0;text-align:center;font-size:13px"><a href="${escapeHtml(siteUrl(site, converted.path))}" style="color:${colors.muted}">The page they converted on</a></p>` : ''}`
  )

  const text = [
    `FlowTrace: ${headline}`,
    '',
    `When: ${formatWhen(visit.startedAt)}`,
    `Came from: ${sourceOf(visit)}`,
    ...(campaign ? [`Campaign: ${campaign}`] : []),
    `Where: ${placeOf(visit)}`,
    `Device: ${deviceOf(visit)}`,
    `Time on site: ${formatDuration(visit.engagedMs)} reading, over ${visitLength(visit)}`,
    `IP address: ${visit.ip}`,
    '',
    'What they did, latest first:',
    ...events.map(
      (event) =>
        `${formatClock(event.at)}  ${
          event.type === 'pageview'
            ? `${event.path}${event.engagedMs ? ` (${formatDuration(event.engagedMs)})` : ''}`
            : `${conversionLabel(event.type)}${event.label ? `: ${event.label}` : ''} on ${event.path}`
        }`
    ),
    '',
    `In FlowTrace: ${visitUrl(site, visit.id)}`,
  ].join('\n')

  return { subject: `FlowTrace: ${subjectOf(visit)}`, html, text }
}

function visitLine(site: FtSite, visit: FtVisit, index: number): string {
  return `<tr><td style="padding:8px 0;${divider(index)}font-size:15px;line-height:1.4"><a href="${escapeHtml(visitUrl(site, visit.id))}" style="color:inherit;font-weight:700">${escapeHtml(visitHeadline(visit))}</a><br /><span style="color:${colors.muted};font-size:13px">${escapeHtml(formatWhen(visit.startedAt))} · ${visit.pageviews} page${visit.pageviews === 1 ? '' : 's'} · ${escapeHtml(deviceOf(visit))}</span></td></tr>`
}

function countRows(rows: { label: string; views: number }[]): string {
  return rows
    .slice(0, 10)
    .map(
      (row, index) =>
        `<tr><td style="padding:6px 0;${divider(index)}font-size:15px">${escapeHtml(row.label)}</td><td style="padding:6px 0;${divider(index)}font-size:15px;text-align:right">${row.views}</td></tr>`
    )
    .join('')
}

/** The daily or weekly summary. */
export function renderDigestEmail(
  summary: FtSummary,
  kind: 'daily' | 'weekly',
  site: FtSite
): FtEmail {
  const first = siteTime(summary.from)
  const last = siteTime(summary.to - 1)
  const period =
    kind === 'daily'
      ? first.toFormat('cccc, LLL d')
      : `${first.toFormat('LLL d')} – ${last.toFormat('LLL d')}`
  const title = `${kind === 'daily' ? 'Daily' : 'Weekly'} summary: ${period}`
  const { conversions } = summary

  const tiles = (
    [
      ['Converted visits', summary.converted],
      [flowTraceConfig.conversionLabels.form, conversions.form],
      [flowTraceConfig.conversionLabels.newsletter, conversions.newsletter],
      [flowTraceConfig.conversionLabels.signup, conversions.signup],
    ] as const
  )
    .map(
      ([label, value]) =>
        `<td style="padding:12px;text-align:center;background:${colors.tint};border-radius:10px"><div style="font-size:24px;font-weight:700">${value}</div><div style="font-size:12px;color:${colors.muted}">${escapeHtml(label)}</div></td>`
    )
    .join('<td style="width:8px"></td>')

  const sources = countRows(
    summary.sources.map((row) => ({
      label: sourceName(row.label),
      views: row.views,
    }))
  )
  const pages = countRows(summary.pages)
  const shown = summary.convertedVisits.length
  const converted =
    summary.convertedVisits
      .map((visit, index) => visitLine(site, visit, index))
      .join('') +
    (summary.converted > shown
      ? `<tr><td style="padding:8px 0;font-size:13px;color:${colors.muted}">The latest ${shown} of ${summary.converted}. Every one is in FlowTrace.</td></tr>`
      : '')

  const html = layout(
    site,
    `${eyebrow(site)}
      <h2 style="margin:0 0 20px;font-size:22px;line-height:1.3">${escapeHtml(title)}</h2>
      <table style="border-collapse:separate;width:100%"><tr>${tiles}</tr></table>
      ${section('Visits that converted', box(converted ? `<table style="border-collapse:collapse;width:100%">${converted}</table>` : `<p style="margin:0;color:${colors.muted};font-size:15px">None this time.</p>`))}
      ${sources ? section('Where they came from', box(`<table style="border-collapse:collapse;width:100%">${sources}</table>`)) : ''}
      ${pages ? section('Pages they viewed', box(`<table style="border-collapse:collapse;width:100%">${pages}</table>`)) : ''}
      <p style="margin:28px 0 0;text-align:center">${button(siteUrl(site, '/?flowtrace'), 'Open FlowTrace')}</p>`
  )

  const text = [
    `FlowTrace ${title}`,
    '',
    `Converted visits: ${summary.converted}  Contact forms: ${conversions.form}  Newsletter sign-ups: ${conversions.newsletter}  Accounts: ${conversions.signup}  Email links: ${conversions.email}`,
    '',
    ...summary.convertedVisits.map(
      (visit) => `${visitHeadline(visit)}\n  ${visitUrl(site, visit.id)}`
    ),
    '',
    `FlowTrace: ${siteUrl(site, '/?flowtrace')}`,
  ].join('\n')

  return {
    subject: `FlowTrace ${title} · ${summary.converted} converted visit${summary.converted === 1 ? '' : 's'}`,
    html,
    text,
  }
}
