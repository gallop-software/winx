import { DateTime } from 'luxon'
import {
  copyrightName,
  copyrightYears,
  editorBio,
  editorName,
  publisher,
  socialLinks,
} from '@/components/footer/config'
import { baseURL } from '@/app/metadata'
import { studioUrl } from '@/utils/studio-helpers'

// The email a post is sent in: a white, Substack-like letter with the author
// at the top and the bottom.
//
// The same values are in the <style> block and on each element,
// because some mail programs drop the <style> block. Rows are tables, which
// the old Outlook lays out where it would collapse a div.

export const SITE_NAME = 'Founder Notes'

// Where the publisher can be reached by post, which the law on marketing
// email (CAN-SPAM) requires every message to say. Left out while empty.
const POSTAL_ADDRESS = (process.env.EMAIL_POSTAL_ADDRESS ?? '').trim()

// Gmail and Apple Mail turn a postal address into a link of their own, in
// their own blue. Linking it ourselves, to the same map, keeps it in the
// email's colour like every other link.
function postalLink(linkStyle: string): string {
  if (!POSTAL_ADDRESS) return ''
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(POSTAL_ADDRESS)}`
  return `<a href="${escapeHtml(map)}" style="${linkStyle}">${escapeHtml(POSTAL_ADDRESS)}</a>`
}

// The reader's address for the editor, from the site's own links.
const EDITOR_EMAIL =
  socialLinks.find((link) => link.href.startsWith('mailto:'))?.href.slice('mailto:'.length) ?? ''

// The text column, as in the template.
export const CONTENT_WIDTH = 540

const FONT = "'Nimbus Sans', 'Liberation Sans', 'Arial', 'Helvetica', sans-serif"

// The template's colours, all in one place.
export const color = {
  text: 'rgb(54,55,55)',
  page: '#ffffff',
  muted: '#888888',
  caption: '#666666',
  rule: '#e0e0e0',
  divider: '#cccccc',
  // The site's primary colour (accent, accent-contrast and accent-dark in
  // src/styles/tailwind.css).
  button: '#84694b',
  buttonText: '#faf8f3',
  buttonHover: '#31291c',
  video: '#84694b',
}

// The template's rem sizes, as pixels: some mail programs do not know rem.
const size = {
  body: '19.2px', // 1.2rem
  title: '27.2px', // 1.7rem
  subheading: '24px', // 1.5rem
  h3: '22.4px', // 1.4rem
  caption: '17.6px', // 1.1rem
  site: '17.6px', // 1.1rem
  date: '15.2px', // 0.95rem
  action: '12px', // 0.75rem
}

// The styles the post's own elements are written with, in
// src/utils/email-post-content.ts.
export const style = {
  p: `margin:20px 0;font-family:${FONT};font-size:${size.body};line-height:1.7;color:${color.text};`,
  title: `margin:0 0 12px 0;font-family:${FONT};font-size:${size.title};font-weight:300;line-height:1.5;letter-spacing:-0.5px;color:${color.text};`,
  subheading: `margin:40px 0 12px 0;font-family:${FONT};font-size:${size.subheading};font-weight:300;line-height:1.5;letter-spacing:-0.5px;color:${color.text};`,
  h3: `margin:40px 0 18px 0;font-family:${FONT};font-size:${size.h3};font-weight:500;line-height:1.5;color:${color.text};`,
  h4: `margin:30px 0 18px 0;font-family:${FONT};font-size:${size.body};font-weight:500;line-height:1.5;color:${color.text};`,
  a: `color:${color.text};text-decoration:underline;`,
  list: `margin:20px 0;padding:0 0 0 28px;font-family:${FONT};font-size:${size.body};line-height:1.7;color:${color.text};`,
  li: 'margin:0 0 8px 0;',
  quote: `display:block;margin:20px 0 40px 0;padding:0 0 0 16px;border-left:3px solid ${color.divider};font-style:italic;`,
  cite: `display:block;margin:0;font-family:${FONT};font-size:${size.body};line-height:1.7;font-style:normal;color:${color.text};`,
  media: 'margin:0 0 30px 0;overflow:hidden;',
  img: 'display:block;margin:0;width:100%;max-width:100%;height:auto;border:0;border-radius:0;',
  caption: `margin:4px 0 0 0;padding:2px 0 0 0;font-family:${FONT};font-size:${size.caption};font-style:italic;font-weight:400;line-height:1.5;color:${color.caption};text-align:left;`,
  hr: `margin:48px 0;border:0;border-top:2px solid ${color.divider};height:0;`,
  pre: `margin:20px 0;padding:14px 16px;background:#f6f6f6;font-family:Menlo,Consolas,monospace;font-size:15px;line-height:1.6;color:${color.text};white-space:pre-wrap;word-break:break-word;`,
  code: 'font-family:Menlo,Consolas,monospace;font-size:0.9em;background:#f6f6f6;padding:1px 4px;',
  table: `width:100%;margin:20px 0;border-collapse:collapse;font-family:${FONT};font-size:16px;line-height:1.5;color:${color.text};`,
  th: `padding:8px 10px;border:1px solid ${color.rule};background:#f6f6f6;text-align:left;font-weight:500;`,
  td: `padding:8px 10px;border:1px solid ${color.rule};vertical-align:top;`,
}

// The <style> block of the template, for the mail programs that read it.
const HEAD_STYLES = `
  body { background: #fff; margin: 0; padding: 0; width: 100%; font-family: ${FONT}; color: ${color.text}; }
  a { color: ${color.text}; text-decoration: underline; }
  /* Addresses, dates and numbers a mail program links by itself keep the
     email's own colour. */
  a[x-apple-data-detectors], #MessageViewBody a, u + #body a {
    color: inherit !important; text-decoration: inherit !important;
    font-size: inherit !important; font-family: inherit !important;
    font-weight: inherit !important; line-height: inherit !important;
  }
  .action { color: ${color.muted} !important; text-decoration: none !important; }
  .buttonPrimary:hover, .buttonSecondary:hover { background-color: ${color.buttonHover} !important; }
  .preheader { display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
  @media only screen and (max-width: 620px) {
    .container { border-radius: 0 !important; box-shadow: none !important; }
    .container-cell { padding: 32px 16px 24px 16px !important; }
  }
`

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// An address a mail program can follow: links and images in an email have no
// page to be relative to.
export function absoluteUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/')) return `${baseURL}${url}`
  return url
}

// The template's full-width, near-black button (.buttonPrimary and
// .buttonSecondary are the same). A table, because the old Outlook ignores
// padding on a link.
export function button(label: string, href: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 8px 0;"><tr><td align="center" bgcolor="${color.button}" style="background:${color.button};box-shadow:0 2px 8px rgba(0,0,0,0.04);"><a href="${escapeHtml(href)}" class="buttonSecondary" style="display:block;padding:16px 20px;font-family:${FONT};font-size:${size.body};line-height:1.2;color:${color.buttonText};text-decoration:none;text-align:center;word-wrap:break-word;">${escapeHtml(label)}</a></td></tr></table>`
}

// The template's video: the picture, then a bar that says Play Video,
// all one link.
export function videoBlock(thumbnail: string, href: string, alt: string): string {
  return `<div style="${style.media}"><a href="${escapeHtml(href)}" style="display:block;text-decoration:none;"><img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(alt)}" width="${CONTENT_WIDTH}" style="${style.img}max-width:${CONTENT_WIDTH}px;" /><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr><td align="center" bgcolor="${color.video}" style="background:${color.video};padding:16px 20px;"><span style="display:inline-block;vertical-align:middle;width:0;height:0;border-top:10px solid transparent;border-bottom:10px solid transparent;border-left:16px solid ${color.buttonText};margin-right:10px;"></span><span style="display:inline-block;vertical-align:middle;font-family:${FONT};font-size:${size.body};font-weight:500;color:${color.buttonText};">Play Video</span></td></tr></table></a></div>`
}

// The editor's photo, square and cut by /api/email/avatar.
function avatar(px: 48 | 64): string {
  return `${baseURL}/api/email/avatar/?size=${px * 2}`
}

// What is put in for each recipient when the email is sent, in
// src/utils/email-tracking.ts.
export const UNSUBSCRIBE_PLACEHOLDER = '{{unsubscribe_url}}'
export const PIXEL_PLACEHOLDER = '<!--open-pixel-->'

export type EmailPost = {
  title: string
  // The post's address on the site.
  url: string
  // The post, already written for email by renderPostForEmail().
  bodyHtml: string
  featuredImage?: { src: string; alt: string; width?: number }
}

// The site's own time zone, as set in WordPress. The Worker's clock is UTC,
// which is already tomorrow on an evening in Texas.
const SITE_ZONE = 'America/Chicago'

// The date on an email is the day it is written out to be sent, not the day
// its post was published.
function today(): string {
  return DateTime.now().setZone(SITE_ZONE).toFormat('LLLL d, yyyy')
}

// The logo, then the author with the date beside his photo, ruled underneath.
function header(date: string): string {
  const logo = absoluteUrl(studioUrl('/logo.png', 'medium'))
  return `
          <tr>
            <td align="center" style="padding:0;">
              <a href="${escapeHtml(baseURL)}/" style="display:block;margin:0 auto;max-width:344px;width:100%;text-decoration:none;">
                <img src="${escapeHtml(logo)}" alt="${escapeHtml(SITE_NAME)}" width="300" style="display:block;margin:0 auto 16px auto;max-width:300px;width:100%;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${CONTENT_WIDTH}px;margin:0 auto;table-layout:fixed;border-bottom:1px solid ${color.rule};">
                <tr>
                  <td align="left" valign="middle" style="padding:16px 0 20px 0;text-align:left;font-family:${FONT};">
                    <span style="font-size:${size.site};font-weight:500;color:${color.text};">${escapeHtml(editorName)}</span>${date ? `<br /><span style="font-size:${size.date};color:${color.muted};">${escapeHtml(date)}</span>` : ''}
                  </td>
                  <td align="right" valign="middle" width="48" style="padding:16px 0 20px 0;">
                    <img src="${escapeHtml(avatar(48))}" alt="${escapeHtml(editorName)}" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:50%;border:0;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
}

// The divider, the author with his bio, the buttons, the small print and the
// unsubscribe link.
function footer(postUrl: string): string {
  const year = DateTime.now().year
  const years = copyrightYears.replace(/\d{4}$/, String(year))
  return `
                <tr>
                  <td style="padding:84px 0 76px 0;"><div style="border-top:2px solid ${color.divider};height:0;line-height:0;font-size:0;">&nbsp;</div></td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="64" valign="top" style="padding:8px 0 0 0;">
                          <img src="${escapeHtml(avatar(64))}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:100%;border:0;" />
                        </td>
                        <td valign="top" style="padding:0 0 0 12px;">
                          <p style="margin:0 0 20px 0;font-family:${FONT};font-size:${size.body};line-height:1.7;color:${color.text};text-align:left;">${escapeHtml(editorBio)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 25px 0;">
                    ${button('Read and comment on the website', postUrl)}
                    ${button(`All essays on ${SITE_NAME}`, `${baseURL}/essays/`)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:23px 0 0 0;text-align:left;">
                    <p style="margin:0;font-family:${FONT};font-size:${size.body};line-height:1.7;color:${color.text};">Copyright © ${escapeHtml(years)} <a href="${escapeHtml(baseURL)}/" style="${style.a}">${escapeHtml(copyrightName)}</a>. All rights reserved. Published by ${escapeHtml(publisher)}${POSTAL_ADDRESS ? `, ${postalLink(style.a)}` : ''}.${EDITOR_EMAIL ? ` | <a href="mailto:${escapeHtml(EDITOR_EMAIL)}" style="${style.a}">${escapeHtml(EDITOR_EMAIL)}</a>` : ''}</p>
                    <p style="margin:30px 0 0 0;text-align:center;font-family:${FONT};font-size:${size.body};line-height:1.4;">
                      <a href="${UNSUBSCRIBE_PLACEHOLDER}" class="unsubscribe" style="color:${color.text};text-decoration:none;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>`
}

// The page around everything: white, with the template's card.
function page(title: string, preheader: string, rows: string): string {
  const hidden = preheader
    ? `<div class="preheader" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:#ffffff;">${escapeHtml(preheader)}${' &zwnj;'.repeat(50)}</div>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${escapeHtml(title)}</title>
<style>${HEAD_STYLES}</style>
</head>
<body style="margin:0;padding:0;width:100%;background:${color.page};font-family:${FONT};color:${color.text};">
${hidden}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${color.page}" style="width:100%;background:${color.page};">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${color.page}" style="width:100%;background:${color.page};border-radius:18px;box-shadow:0 4px 32px rgba(0,0,0,0.08);">
        <tr>
          <td align="center" class="container-cell" style="padding:48px 32px 32px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
${rows}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
${PIXEL_PLACEHOLDER}
</body>
</html>`
}

// The text column: 540 pixels, left aligned, under the header.
function column(rows: string): string {
  return `
          <tr>
            <td align="center" style="padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${CONTENT_WIDTH}px;margin:0 auto;text-align:left;table-layout:fixed;">
${rows}
              </table>
            </td>
          </tr>`
}

// The two small buttons under the title: one opens a new email with the
// post's address in it, to pass it on, and one goes to the post on the site.
function headingActions(post: EmailPost): string {
  const shared = `${post.url}${post.url.includes('?') ? '&' : '?'}utm_source=share`
  const mailto = `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(shared)}`
  const pill = `display:inline-block;padding:8px 14px 7px 14px;border:1px solid ${color.divider};border-radius:999px;font-family:${FONT};font-size:${size.action};line-height:1;text-transform:uppercase;text-decoration:none;color:${color.muted};`
  // The arrow is a picture, as in the template: a mail program draws the
  // character each in its own way.
  const arrow = absoluteUrl(studioUrl('/link.png', 'full'))
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:12px 0 24px 0;">
                      <tr>
                        <td align="left" style="padding:0;"><a href="${escapeHtml(mailto)}" class="action" style="${pill}">Share</a></td>
                        <td align="right" style="padding:0;"><a href="${escapeHtml(post.url)}" class="action" style="${pill}">Read on Website<img src="${escapeHtml(arrow)}" alt="" width="8" height="8" style="display:inline-block;width:8px;height:8px;margin:0 0 0 8px;padding:0 0 2px 0;border:0;vertical-align:middle;" /></a></td>
                      </tr>
                    </table>`
}

// The whole email. `preheader` is the line an inbox shows after the subject.
export function renderEmail(post: EmailPost, preheader: string): string {
  // As the pictures in the post: never stretched, never wider than the column.
  const featuredWidth = Math.min(post.featuredImage?.width || CONTENT_WIDTH, CONTENT_WIDTH)
  const featured = post.featuredImage
    ? `<div style="${style.media}"><a href="${escapeHtml(post.url)}"><img src="${escapeHtml(absoluteUrl(post.featuredImage.src))}" alt="${escapeHtml(post.featuredImage.alt)}" width="${featuredWidth}" style="${style.img}max-width:${featuredWidth}px;margin:0 auto;" /></a></div>`
    : ''

  const body = `
                <tr>
                  <td style="padding:50px 0 0 0;text-align:left;overflow-wrap:anywhere;word-break:break-word;">
                    <h2 style="${style.title}"><a href="${escapeHtml(post.url)}" style="color:${color.text};text-decoration:none;">${escapeHtml(post.title)}</a></h2>
                    ${headingActions(post)}
                    ${featured}
                    ${post.bodyHtml}
                  </td>
                </tr>
${footer(post.url)}`

  return page(post.title, preheader, header(today()) + column(body))
}

// The same email for a mail program that shows no HTML.
export function renderEmailText(post: EmailPost, bodyText: string): string {
  return [
    post.title,
    `${editorName} · ${today()}`,
    '',
    bodyText,
    '',
    `Read and comment on the website: ${post.url}`,
    '',
    '--',
    `${SITE_NAME} · ${baseURL}/`,
    `© ${copyrightYears} ${copyrightName}. Published by ${publisher}.`,
    ...(POSTAL_ADDRESS ? [POSTAL_ADDRESS] : []),
    `Unsubscribe: ${UNSUBSCRIBE_PLACEHOLDER}`,
  ].join('\n')
}

// The email that asks someone to confirm their address before they go on the
// list, in the same letter: the logo and the author, one button, and nothing
// to unsubscribe from yet.
// A name typed into a public form goes into a greeting only when it looks
// like a name: letters, spaces, hyphens and apostrophes, a few words. Anything
// else (a link, a sentence) is left out, so the site's email cannot carry it.
function greetingFor(firstName: string): string {
  const name = firstName.trim()
  const looksLikeName =
    name.length <= 40 && /^\p{L}[\p{L}\p{M}' -]*$/u.test(name) && name.split(' ').length <= 3
  return looksLikeName ? `Dear ${name},` : 'Hello,'
}

export function renderConfirmationEmail(input: { firstName: string; url: string }): {
  subject: string
  html: string
  text: string
} {
  const greeting = greetingFor(input.firstName)
  const subject = `Confirm your subscription to ${SITE_NAME}`
  const lines = [
    `Please confirm that you would like each new essay from ${SITE_NAME} by email. Press the button below; nothing is sent until you do.`,
    'If you did not ask for this, ignore this email and you will not hear from us.',
  ]

  const body = `
                <tr>
                  <td style="padding:62px 0 0 0;text-align:left;overflow-wrap:anywhere;word-break:break-word;">
                    <h2 style="${style.title}">${escapeHtml(greeting)}</h2>
                    <p style="${style.p}">${escapeHtml(lines[0]!)}</p>
                    <div style="margin:30px 0;">${button('Yes, subscribe me', input.url)}</div>
                    <p style="${style.p}">${escapeHtml(lines[1]!)}</p>
                    <p style="margin:48px 0 0 0;font-family:${FONT};font-size:${size.caption};line-height:1.7;color:${color.muted};">© ${escapeHtml(copyrightYears)} ${escapeHtml(copyrightName)}. Published by ${escapeHtml(publisher)}${POSTAL_ADDRESS ? `, ${postalLink(`color:${color.muted};text-decoration:underline;`)}` : ''}.</p>
                  </td>
                </tr>`

  const html = page(subject, '', header('') + column(body)).replace(PIXEL_PLACEHOLDER, '')
  const text = [greeting, '', lines[0], '', `Confirm: ${input.url}`, '', lines[1], '', '--', `${SITE_NAME} · ${baseURL}/`].join('\n')

  return { subject, html, text }
}

// The email that asks someone to confirm their address before they have an
// account, in the same letter. The link opens the page where they choose a
// password; nothing exists until they do.
export function renderAccountConfirmationEmail(input: { firstName: string; url: string }): {
  subject: string
  html: string
  text: string
} {
  const greeting = greetingFor(input.firstName)
  const subject = `Confirm your account on ${SITE_NAME}`
  const lines = [
    `Thanks for signing up to ${SITE_NAME}. Press the button below to confirm your email address and choose a password.`,
    'The link expires in 48 hours. If you did not ask for this, you can ignore this email; nothing happens until the link is opened.',
  ]

  const body = `
                <tr>
                  <td style="padding:62px 0 0 0;text-align:left;overflow-wrap:anywhere;word-break:break-word;">
                    <h2 style="${style.title}">${escapeHtml(greeting)}</h2>
                    <p style="${style.p}">${escapeHtml(lines[0]!)}</p>
                    <div style="margin:30px 0;">${button('Confirm my email address', input.url)}</div>
                    <p style="${style.p}">${escapeHtml(lines[1]!)}</p>
                    <p style="margin:48px 0 0 0;font-family:${FONT};font-size:${size.caption};line-height:1.7;color:${color.muted};">© ${escapeHtml(copyrightYears)} ${escapeHtml(copyrightName)}. Published by ${escapeHtml(publisher)}${POSTAL_ADDRESS ? `, ${postalLink(`color:${color.muted};text-decoration:underline;`)}` : ''}.</p>
                  </td>
                </tr>`

  const html = page(subject, '', header('') + column(body)).replace(PIXEL_PLACEHOLDER, '')
  const text = [greeting, '', lines[0], '', `Confirm: ${input.url}`, '', lines[1], '', '--', `${SITE_NAME} · ${baseURL}/`].join('\n')

  return { subject, html, text }
}
