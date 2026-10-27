import { isSameOrigin, visitorIp } from '@/utils/comment-guard'
import { allowAttempt, hashAddress } from '@/utils/member-guard'
import { readJsonObject } from '@/utils/read-body'
import { getBccAddress, isEmail, sendEmail } from '@/utils/send-email'
import { absoluteUrl, SITE_NAME } from '@/utils/email-template'
import { studioUrl } from '@/utils/studio-helpers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderValueCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') {
    const trimmed = v.trim()
    const esc = escapeHtml(trimmed).replace(/\r?\n/g, '<br>')
    return esc
  }
  if (Array.isArray(v)) {
    return v
      .map((x) =>
        typeof x === 'string' ? escapeHtml(x) : escapeHtml(JSON.stringify(x))
      )
      .join(', ')
  }
  return escapeHtml(JSON.stringify(v))
}

function renderEmailHtml(payload: Record<string, any>) {
  const rows: string[] = []

  for (const [key, val] of Object.entries(payload)) {
    if (key === 'emailSubject') continue

    // files
    if (key === 'files') {
      if (Array.isArray(val) && val.length) {
        const fileNames = val
          .map((f) => escapeHtml(f?.name || 'attachment'))
          .join(', ')
        const label = escapeHtml(val[0]?.label ?? key)
        rows.push(
          `<p class="row"><strong class="key">${label}:</strong><span class="val">${fileNames}</span></p>`
        )
      } else {
        rows.push(
          `<p class="row"><strong class="key">${escapeHtml(key)}:</strong><span class="val"></span></p>`
        )
      }
      continue
    }

    const label =
      typeof val === 'object' && val
        ? escapeHtml((val as any).label ?? key)
        : escapeHtml(key)

    const value =
      typeof val === 'object' && val && (val as any).value !== undefined
        ? renderValueCell((val as any).value)
        : renderValueCell(val)

    rows.push(
      `<p class="row"><strong class="key">${label}:</strong><span class="val">${value}</span></p>`
    )
  }

  return `<!doctype html>
    <html>
    <head>
    <meta charset="utf-8" />
    <style>
      body{background:#f7f7f7;font-family:Arial, sans-serif;margin:0;padding:20px}
      .container{max-width:100%;margin:auto;background:#f7f7f7;padding:75px 15px;}
      .content{width: 550px;margin:0 auto;}
      .logo{display:block;margin:0 auto 20px;max-width:200px; padding-bottom: 20px;}
      .row{margin:0 0 20px 0;line-height:1.45;font-size: 1.2rem;}
      .key{font-weight:700;margin-right:.35rem;display:inline-block}
      .val{display:inline}
      .multiline{white-space:pre-wrap;background:#f7f7f7;border-radius:6px;padding:8px;display:inline-block}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <img class="logo" src="${absoluteUrl(studioUrl('/logo.png', 'medium'))}" alt="${escapeHtml(SITE_NAME)}" />
          ${rows.join('')}
        </div>
      </div>
    </body>
    </html>`
}

function renderEmailText(payload: Record<string, any>) {
  const lines: string[] = []

  for (const [key, val] of Object.entries(payload)) {
    if (key === 'files') {
      if (Array.isArray(val) && val.length) {
        const names = val.map((f) => f?.name || 'attachment').join(', ')
        lines.push(`${val[0]?.label ?? key}: ${names}`)
      }
      continue
    }

    const isField = typeof val === 'object' && val
    const label = isField ? ((val as any).label ?? key) : key
    const value =
      isField && (val as any).value !== undefined ? (val as any).value : val

    lines.push(
      `${label}: ${
        Array.isArray(value)
          ? value.join(', ')
          : typeof value === 'string'
            ? value.trim()
            : JSON.stringify(value ?? '')
      }`
    )
  }

  return lines.join('\n\n')
}

// Attachments come as data URLs, a third larger than the files.
const MAX_BODY_BYTES = 12 * 1024 * 1024

const NO_STORE = { 'Cache-Control': 'no-store' }

function refuse(message: string, status: number, retryAfter?: number) {
  return NextResponse.json(
    { message },
    {
      status,
      headers: {
        ...NO_STORE,
        ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
      },
    }
  )
}

// Emails a message to the site's own inbox (EMAIL_TO, and EMAIL_BCC), and to
// nobody else: the address a visitor types is only the one replies go to,
// never a recipient, so the form cannot be used to send mail to anyone.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return refuse('Not from this site', 403)

  const input = await readJsonObject(req, MAX_BODY_BYTES)
  if (input === 'too_large') return refuse('That is too much to send.', 413)
  if (input === null) return refuse('The message could not be read.', 400)
  const payload = input as Record<string, any>

  const allowed = await allowAttempt({
    kind: 'contact',
    ipHash: await hashAddress(visitorIp(req)),
  })
  if (!allowed.ok) {
    return refuse(
      'Too many messages. Try again later.',
      429,
      allowed.retryAfter
    )
  }

  const emailSubjectValue = payload.emailSubject?.value
    ? String(payload.emailSubject.value)
    : 'Form Submission'
  const displayPayload = { ...payload }
  delete (displayPayload as any).emailSubject
  // How long the form took to fill in: the form's own check, not the message.
  delete (displayPayload as any)._submissionTime

  const html = renderEmailHtml(displayPayload)
  const text = renderEmailText(displayPayload)

  const productionUrlClean = process.env.NEXT_PUBLIC_PRODUCTION_URL?.replace(
    /^https?:\/\//,
    ''
  )

  const first =
    payload.firstName?.value ||
    payload.firstname?.value ||
    payload.name?.value ||
    ''
  const last = payload.lastName?.value || payload.lastname?.value || ''
  const emailValue = payload.email?.value || payload.contactEmail?.value
  // A malformed address would fail the whole send, so it is left out instead.
  const email = isEmail(emailValue) ? emailValue : undefined
  const displayName = [first, last].filter(Boolean).join(' ') || first || email

  const subject = displayName
    ? `${displayName}: ${emailSubjectValue} ${productionUrlClean}`
    : `${emailSubjectValue} ${productionUrlClean}`

  const visitor = email ? { name: String(displayName), email } : undefined
  const bcc = getBccAddress()

  // The client sends each file as a data URL; Cloudflare wants bare base64.
  const files = Array.isArray(payload.files) ? payload.files : []
  const attachments = files
    .filter((file: any) => typeof file?.base64 === 'string')
    .map((file: any) => ({
      content: file.base64.split(',')[1] ?? '',
      filename: String(file.name || 'attachment'),
      type: String(file.type || 'application/octet-stream'),
      disposition: 'attachment' as const,
    }))

  const ok = await sendEmail({
    ...(bcc ? { bcc: [bcc] } : {}),
    ...(visitor ? { replyTo: visitor } : {}),
    subject,
    html,
    text,
    attachments,
  })

  return NextResponse.json(
    { message: ok ? 'Message sent. Thank you.' : 'An error occurred.' },
    { status: ok ? 200 : 500, headers: NO_STORE }
  )
}
