import { NextResponse } from 'next/server'
import { DateTime, Duration } from 'luxon'
import { studioUrl } from '@/utils/studio-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const zone = 'America/Chicago'

/* --------------------------------------------------------
 * Utility: Form Data Encoding
 * ------------------------------------------------------ */
function encodeFormData(data: Record<string, any>) {
  const fd = new FormData()

  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      for (const item of v) fd.append(k, item as any)
    } else if (v !== undefined && v !== null) {
      fd.append(k, v as any)
    }
  }

  return fd
}

/* --------------------------------------------------------
 * Utility: Duration (ms → human-readable)
 * ------------------------------------------------------ */
function humanFromMs(ms: number): string {
  const dur = Duration.fromMillis(ms).shiftTo(
    'days',
    'hours',
    'minutes',
    'seconds'
  )

  const parts: string[] = []

  if (dur.days) parts.push(`${dur.days} day${dur.days === 1 ? '' : 's'}`)
  if (dur.hours) parts.push(`${dur.hours} hr${dur.hours === 1 ? '' : 's'}`)
  if (dur.minutes)
    parts.push(`${dur.minutes} min${dur.minutes === 1 ? '' : 's'}`)

  const secs = Math.round(dur.seconds)
  if (secs || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(parts.length > 2 ? ', ' : ' ')
}

/* --------------------------------------------------------
 * Utility: Device Detection
 * ------------------------------------------------------ */
function detectDeviceType(
  ua: string
): 'Mobile' | 'Tablet' | 'Desktop' | 'Unknown' {
  const agent = ua.toLowerCase()
  if (!agent) return 'Unknown'

  if (/ipad|tablet|(android(?!.*mobile))/.test(agent)) return 'Tablet'
  if (/mobi|iphone|ipod|android.*mobile|blackberry|phone/.test(agent))
    return 'Mobile'
  if (/windows|macintosh|linux|x11/.test(agent)) return 'Desktop'

  return 'Unknown'
}

/* --------------------------------------------------------
 * Utility: HTML Escaping
 * ------------------------------------------------------ */
function escapeHtml(s: any) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/* --------------------------------------------------------
 * Utility: Inline Rendering
 * ------------------------------------------------------ */
function renderInlineValue(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string')
    return escapeHtml(v.trim()).replace(/\r?\n/g, '<br>')
  return escapeHtml(String(v))
}

/* --------------------------------------------------------
 * Utility: Key/Value Section Rendering
 * ------------------------------------------------------ */
function renderPlainRows(data: Record<string, any>): string {
  return Object.entries(data)
    .map(
      ([k, v]) =>
        `<p class="row"><strong class="key">${escapeHtml(k)}:</strong> <span class="val">${renderInlineValue(
          v
        )}</span></p>`
    )
    .join('\n')
}

function renderSection(
  title: string,
  data: Record<string, any> | null | undefined
) {
  if (!data || Object.keys(data).length === 0) return ''

  return `
    <hr>
    ${
      title
        ? `<h3 style="font-size:1.1rem;margin:16px 0 10px;color:#222">${escapeHtml(title)}</h3>`
        : ''
    }
    ${renderPlainRows(data)}
  `
}

/* --------------------------------------------------------
 * Utility: URL Helpers
 * ------------------------------------------------------ */
function stripTrailingSlash(u: string) {
  return u.endsWith('/') ? u.slice(0, -1) : u
}

function ensureLeadingSlash(p: string) {
  return p.startsWith('/') ? p : `/${p}`
}

/* --------------------------------------------------------
 * Path Rendering Section
 * ------------------------------------------------------ */
function renderPathSection(
  arr: Array<{ path: string; ts: string; spentMs: number; source?: string }>,
  baseUrl: string
) {
  if (!Array.isArray(arr) || arr.length === 0) return ''

  const base = stripTrailingSlash(baseUrl || '')

  const rows = arr
    .map((p) => {
      const ts = p?.ts
        ? DateTime.fromISO(escapeHtml(p.ts))
            .setZone(zone)
            .toFormat('MM/dd/yy hh:mm:ss a')
        : ''

      const rawPath = p?.path || ''
      if (!rawPath) {
        return `<p class="row"><strong class="key">Time:</strong> <span class="val">${ts}</span></p>`
      }

      const safePath = escapeHtml(rawPath)
      const fullHref = base ? `${base}${ensureLeadingSlash(rawPath)}` : safePath
      const safeHref = escapeHtml(fullHref)
      const source = p?.source
      const duration = humanFromMs(p?.spentMs)

      return `
        <p class="row">
          ${source ? `<strong class="key">Time:</strong> <span class="val">${ts}</span><br>` : ''}
          ${
            !source
              ? `<strong class="key">Duration:</strong> <span class="val">${duration}</span><br>`
              : ''
          }
          ${source ? `<strong class="key">Referrer:</strong> ${source}<br>` : ''}
          <strong class="key">Path:</strong> 
          <a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safePath}</a>
        </p>`
    })
    .join('\n')

  return `
    <hr>
    <h3 style="font-size:1.1rem;margin:16px 0 10px;color:#222">Path</h3>
    ${rows}
  `
}

/* --------------------------------------------------------
 * Email Template Renderer
 * ------------------------------------------------------ */
function renderEmailHtml(args: {
  element?: Record<string, any>
  context?: Record<string, any>
  ip?: string
  ua?: string
  deviceType?: string
  geo?: string
  timeNow: any
  firstSeen: any
  sessionStart: any
  totalDuration: any
}) {
  const {
    element,
    context,
    ip,
    ua,
    deviceType,
    geo,
    timeNow,
    sessionStart,
    totalDuration,
  } = args

  const baseUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || ''

  const event = {
    When: timeNow.toFormat('MM/dd/yy hh:mm:ss a'),
    'IP Address': ip || '',
    'Geo Location': geo,
    'User-Agent': ua || '',
    'Device Type': deviceType || '',
    URL: context?.page?.url || '',
    'Session Duration': humanFromMs(timeNow.diff(sessionStart).toMillis()),
    'Total Duration': humanFromMs(totalDuration),
  }

  const pathFormat = Array.isArray(context?.path)
    ? context!.path.slice(-100).reverse()
    : []

  return `<!doctype html>
    <html>
    <head>
    <meta charset="utf-8" />
    <style>
    body {
        background-color: #f7f7f7;
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        width: 100%;
    }
    .container {
        background-color: #f7f7f7;
        max-width: 100%;
        margin: auto;
        padding: 75px 15px;
        text-align: center;
    }
    .content {
        max-width: 400px;
        display: inline-block;
        text-align: left;
    }
    .logo {
        display: block;
        margin: 0 auto 20px;
        max-width: 400px;
        width: 90%;
    }
    .row { margin: 0 0 10px 0; line-height: 1.45; font-size: 1rem; color: #000000; }
    .key { font-weight: 700; margin-right: .35rem; display: inline-block; color: inherit !important; }
    .val { display: inline; color: inherit !important; }
    hr { border: none; border-top: 1px solid #000000; margin: 24px 0; }
    </style>
    </head>

    <body>
    <div class="container">
        <div class="content">
        <img src="${studioUrl('/images/logo.png', 'medium')}" alt="Logo" class="logo" />
        <h2 style="font-size:1.25rem;margin:0 0 6px">
            ${element?.href ? 'Click - ' + element?.href : 'Click'} - ${element?.innerText || element?.id || ''}
        </h2>

        ${renderSection('', event)}
        ${renderPathSection(pathFormat as any, baseUrl)}
        </div>
    </div>
    </body>
    </html>`
}

/* --------------------------------------------------------
 * Geo IP Resolver
 * ------------------------------------------------------ */
async function resolveGeo(ip: string): Promise<string> {
  try {
    if (
      !ip ||
      ip.startsWith('::1') ||
      ip.startsWith('127.') ||
      ip === 'unknown'
    ) {
      return 'LocalHost'
    }

    const resp = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'FlowTraceGeo/1.0' },
    })

    if (!resp.ok) return ''

    const data = await resp.json()
    const parts = [data.city, data.region, data.country_name].filter(Boolean)

    return parts.join(', ')
  } catch {
    return ''
  }
}

/* --------------------------------------------------------
 * POST Handler
 * ------------------------------------------------------ */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { element, context } = body || {}

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      (req as any).ip ||
      'unknown'

    const ua = req.headers.get('user-agent') || ''
    const deviceType = detectDeviceType(ua)
    const geo = await resolveGeo(ip)

    const timeNow = DateTime.now().setZone(zone)
    const firstSeen = DateTime.fromISO(context.firstSeen).setZone(zone)
    const sessionStart = DateTime.fromISO(context.sessionStart).setZone(zone)
    const totalDuration = context.timeSpentTotalMs

    const emailHtml = renderEmailHtml({
      element,
      context,
      ip,
      ua,
      deviceType,
      geo,
      timeNow,
      firstSeen,
      sessionStart,
      totalDuration,
    })

    const isDevelopment = true
    const productionUrlClean = process.env.NEXT_PUBLIC_PRODUCTION_URL?.replace(
      /^https?:\/\//,
      ''
    )

    const subject = `[FlowTrace] ${productionUrlClean || 'Site'} — ${timeNow}`

    const mailBody: Record<string, any> = {
      from: `${process.env.MAILGUN_FROM_NAME} <contact@${process.env.MAILGUN_DOMAIN_NAME}>`,
      to: isDevelopment
        ? `${process.env.MAILGUN_DEV_NAME} <${process.env.MAILGUN_DEV_MAIL}>`
        : `${process.env.MAILGUN_FROM_NAME} <${process.env.MAILGUN_SMTP_MAIL}>`,
      ...(!isDevelopment
        ? {
            bcc: [
              `${process.env.MAILGUN_DEV_NAME} <${process.env.MAILGUN_DEV_MAIL}>`,
            ],
          }
        : {}),
      subject,
      html: emailHtml,
    }

    const resp = await fetch(
      `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN_NAME}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `api:${process.env.MAILGUN_API_KEY}`
          ).toString('base64')}`,
        },
        body: encodeFormData(mailBody),
      }
    )

    const data = await resp.text()

    const ok =
      data !== 'Forbidden' &&
      (() => {
        try {
          return JSON.parse(data).id
        } catch {
          return null
        }
      })()

    return NextResponse.json(
      { message: ok ? 'FlowTrace sent.' : 'An error occurred.' },
      { status: ok ? 200 : 500 }
    )
  } catch {
    return NextResponse.json({ message: 'An error occurred.' }, { status: 500 })
  }
}
