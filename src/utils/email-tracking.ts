import 'server-only'
import { baseURL } from '@/app/metadata'
import { getCommentSecret } from '@/utils/comments'
import {
  PIXEL_PLACEHOLDER,
  UNSUBSCRIBE_PLACEHOLDER,
} from '@/utils/email-template'
import {
  deriveHmacKey,
  fromBase64Url,
  signText,
  toBase64Url,
  verifyText,
} from '@/utils/signing'

// The links a mailing carries for one recipient: the picture that records an
// open, the address each link goes through so a click is recorded, and the
// unsubscribe link.
//
// Cloudflare reports deliveries and bounces but not opens or clicks, so the
// site records those itself. Each link is signed for one recipient and one
// purpose: nobody can make one up for someone else, and the click address
// only ever forwards to a link that was in the email.

const SALT = 'gallop.mailing'
const PURPOSE = 'links-v1'

type Kind = 'open' | 'click' | 'unsubscribe'

function key(): Promise<CryptoKey> {
  return deriveHmacKey(getCommentSecret(), SALT, PURPOSE)
}

function signed(kind: Kind, recipientId: number, url = ''): string {
  return `${kind}\n${recipientId}\n${url}`
}

async function sign(kind: Kind, recipientId: number, url = ''): Promise<string> {
  return signText(await key(), signed(kind, recipientId, url))
}

// The recipient a link was made for, or null if it is not one of ours.
export async function verifyLink(
  kind: Kind,
  recipient: string | null,
  signature: string | null,
  url = ''
): Promise<number | null> {
  const id = Number(recipient)
  if (!recipient || !signature || !Number.isInteger(id) || id <= 0) return null
  if (!getCommentSecret()) return null
  return (await verifyText(await key(), signed(kind, id, url), signature)) ? id : null
}

// The page a reader confirms on, and the address a mail program's own
// unsubscribe button posts to.
export async function unsubscribeUrls(
  recipientId: number
): Promise<{ page: string; oneClick: string }> {
  const query = `r=${recipientId}&s=${await sign('unsubscribe', recipientId)}`
  return {
    page: `${baseURL}/account/unsubscribe/?${query}`,
    oneClick: `${baseURL}/api/email/unsubscribe/?${query}`,
  }
}

// Visits from a mailing show up as such in analytics.
function tagged(url: string, campaign: string): string {
  if (!url.startsWith(baseURL)) return url
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('utm_source', 'newsletter')
    parsed.searchParams.set('utm_medium', 'email')
    parsed.searchParams.set('utm_campaign', campaign)
    return parsed.toString()
  } catch {
    return url
  }
}

// The destination a click address carries travels as base64url, not as an
// encoded URL. The host rebuilds a request's query string without encoding it
// again, so a destination with an "&" of its own arrived cut short, its
// signature no longer matched, and the click was never recorded.
function encodeDestination(url: string): string {
  return toBase64Url(new TextEncoder().encode(url))
}

// Where a click address leads, or '' if it does not say. Emails sent before
// the destination was encoded carry it as it is, in `u`.
export function clickDestination(query: URLSearchParams): string {
  const encoded = query.get('d')
  if (!encoded) return query.get('u') ?? ''
  const bytes = fromBase64Url(encoded)
  if (!bytes) return ''
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return ''
  }
}

function unescapeAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

export type Personalised = {
  html: string
  text: string
  headers: Record<string, string>
}

// The campaign's email as one recipient gets it.
export async function personalise(
  campaign: { html: string; text: string; slug: string },
  recipientId: number
): Promise<Personalised> {
  const unsubscribe = await unsubscribeUrls(recipientId)

  // Every web link goes through the click address. mailto: and tel: links
  // are left alone, and so is the unsubscribe link, which must work even if
  // the click address does not.
  const links = new Map<string, string>()
  for (const match of campaign.html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const escaped = match[1]!
    if (links.has(escaped)) continue
    const target = tagged(unescapeAttribute(escaped), campaign.slug)
    const signature = await sign('click', recipientId, target)
    links.set(
      escaped,
      `${baseURL}/api/email/click/?r=${recipientId}&s=${signature}&d=${encodeDestination(target)}`
    )
  }

  const pixel = `<img src="${baseURL}/api/email/open/?r=${recipientId}&amp;s=${await sign('open', recipientId)}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;border:0;" />`

  const html = campaign.html
    .replace(/href="(https?:\/\/[^"]+)"/g, (whole, escaped: string) => {
      const tracked = links.get(escaped)
      return tracked ? `href="${escapeAttribute(tracked)}"` : whole
    })
    .replaceAll(UNSUBSCRIBE_PLACEHOLDER, escapeAttribute(unsubscribe.page))
    .replace(PIXEL_PLACEHOLDER, pixel)

  return {
    html,
    text: campaign.text.replaceAll(UNSUBSCRIBE_PLACEHOLDER, unsubscribe.page),
    headers: {
      // What a mail program's own "Unsubscribe" button uses (RFC 8058).
      'List-Unsubscribe': `<${unsubscribe.oneClick}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

// The email with nobody's links in it, for the preview and the test send:
// nothing is recorded, and the unsubscribe link goes nowhere that acts.
export function unpersonalised(campaign: { html: string; text: string }): {
  html: string
  text: string
} {
  const account = `${baseURL}/account/`
  return {
    html: campaign.html
      .replaceAll(UNSUBSCRIBE_PLACEHOLDER, account)
      .replace(PIXEL_PLACEHOLDER, ''),
    text: campaign.text.replaceAll(UNSUBSCRIBE_PLACEHOLDER, account),
  }
}
