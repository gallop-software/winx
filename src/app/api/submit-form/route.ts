import { studioUrl } from '@/utils/studio-helpers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function encodeFormData(data: Record<string, any>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) for (const item of v) fd.append(k, item as any)
    else if (v !== undefined && v !== null) fd.append(k, v as any)
  }
  return fd
}

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
          <img class="logo" src="${studioUrl('/images/logo.png')}" alt="Logo" />
          ${rows.join('')}
        </div>
      </div>
    </body>
    </html>`
}

export async function POST(req: Request) {
  const payload = (await req.json().catch(() => ({}))) as Record<string, any>

  const emailSubjectValue = payload.emailSubject?.value
    ? String(payload.emailSubject.value)
    : 'Form Submission'
  const displayPayload = { ...payload }
  delete (displayPayload as any).emailSubject

  const html = renderEmailHtml(displayPayload)

  const isDevelopment = process.env.NODE_ENV === 'development'
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
  const email = payload.email?.value || payload.contactEmail?.value || undefined
  const displayName = [first, last].filter(Boolean).join(' ') || first || email

  const subject = displayName
    ? `${displayName}: ${emailSubjectValue} ${productionUrlClean}`
    : `${emailSubjectValue} ${productionUrlClean}`

  const body: Record<string, any> = {
    from: `${process.env.MAILGUN_FROM_NAME} <contact@${process.env.MAILGUN_DOMAIN_NAME}>`,
    to: isDevelopment
      ? `${process.env.MAILGUN_DEV_NAME} <${process.env.MAILGUN_DEV_MAIL}>`
      : `${process.env.MAILGUN_FROM_NAME} <${process.env.MAILGUN_SMTP_MAIL}>`,
    ...(!isDevelopment && {
      bcc: [
        `${process.env.MAILGUN_DEV_NAME} <${process.env.MAILGUN_DEV_MAIL}>`,
        ...(email ? [`${displayName} <${email}>`] : []),
      ],
    }),
    ...(email ? { 'h:Reply-To': `${displayName} <${email}>` } : {}),
    subject,
    html,
  }

  // Attach files from base64 (client already encodes)
  const files = Array.isArray(payload.files) ? payload.files : []
  if (files.length) {
    body.attachment = files.map((file: any) => {
      const buffer = Buffer.from(file.base64.split(',')[1], 'base64')
      return new File([buffer], file.name, { type: file.type })
    })
  }

  const resp = await fetch(
    `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN_NAME}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
      },
      body: encodeFormData(body),
    }
  )

  const text = await resp.text()
  let ok = false
  try {
    ok = text !== 'Forbidden' && Boolean(JSON.parse(text).id)
  } catch {
    ok = false
  }

  return NextResponse.json(
    { message: ok ? 'Message sent. Thank you.' : 'An error occurred.' },
    { status: ok ? 200 : 500 }
  )
}
