import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'

type Address = string | { name: string; email: string }

type Attachment = {
  // Base64, without the `data:...;base64,` prefix.
  content: string
  filename: string
  type: string
  disposition: 'attachment'
}

type Message = {
  from: Address
  to: Address | Address[]
  bcc?: Address[]
  replyTo?: Address
  subject: string
  html: string
  text: string
  attachments?: Attachment[]
  // List-Unsubscribe and the like. Cloudflare allows a short list of names
  // and anything starting with X-.
  headers?: Record<string, string>
}

// The EMAIL binding from wrangler.jsonc, typed here for the same reason as
// the DB binding in src/utils/prisma.ts.
type SendEmail = {
  send(message: Message): Promise<{ messageId: string }>
}

// Loose on purpose: it only has to stop a malformed address from failing the
// whole send. Cloudflare does the real validation.
const EMAIL_PATTERN = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/

export function isEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    EMAIL_PATTERN.test(value)
  )
}

// One inbox, however its address is written: case, a +tag, and Gmail's dots
// all reach the same person. Used to count what an address has been sent,
// never to send.
export function inboxOf(email: string): string {
  const [local = '', domain = ''] = email.trim().toLowerCase().split(/@(?=[^@]*$)/)
  const host = domain.replace(/\.+$/, '').replace(/^googlemail\.com$/, 'gmail.com')
  let name = local.split('+')[0] ?? ''
  if (host === 'gmail.com') name = name.replace(/\./g, '')
  return `${name}@${host}`.normalize('NFKC')
}

function emailOf(value: Address) {
  return (typeof value === 'string' ? value : value.email).toLowerCase()
}

function address(email: string | undefined, name?: string): Address | null {
  if (!isEmail(email)) return null
  return name ? { name, email } : email
}

export type SendResult =
  | { ok: true; messageId: string }
  // The code is Cloudflare's, such as E_DAILY_LIMIT_EXCEEDED, or one of the
  // site's own: not_configured, no_message_id.
  | { ok: false; code: string; reason: string }

type Outgoing = {
  // The name it comes from, in place of EMAIL_FROM_NAME. The address is
  // always EMAIL_FROM.
  fromName?: string
  // Defaults to EMAIL_TO, the inbox that receives contact form messages.
  to?: Address
  bcc?: Address[]
  replyTo?: Address
  subject: string
  html: string
  text: string
  attachments?: Attachment[]
  headers?: Record<string, string>
}

// Sends through Cloudflare Email Sending. The sender must be on the domain
// enabled for sending (set in EMAIL_FROM). Under `next dev` the binding is
// simulated: the message is logged to the terminal and nothing is delivered.
export async function sendEmail(message: Outgoing): Promise<boolean> {
  return (await sendEmailMessage(message)).ok
}

// The same, for a caller that keeps the message's id, which Cloudflare's
// delivery events carry, or has to tell one refusal from another.
export async function sendEmailMessage(message: Outgoing): Promise<SendResult> {
  const from = address(
    process.env.EMAIL_FROM,
    message.fromName ?? process.env.EMAIL_FROM_NAME
  )
  const to = message.to ?? address(process.env.EMAIL_TO)

  if (!from || !to) {
    console.error('Email not sent: EMAIL_FROM or EMAIL_TO is missing.')
    return { ok: false, code: 'not_configured', reason: 'No sender or recipient' }
  }

  // One copy per inbox, even when EMAIL_TO and EMAIL_BCC are the same address.
  const seen = new Set([emailOf(to)])
  const bcc = (message.bcc ?? []).filter((recipient) => {
    const email = emailOf(recipient)
    if (seen.has(email)) return false
    seen.add(email)
    return true
  })

  try {
    const env = getCloudflareContext().env as unknown as { EMAIL?: SendEmail }
    if (!env.EMAIL) {
      console.error('Email not sent: the EMAIL binding is missing.')
      return { ok: false, code: 'not_configured', reason: 'No EMAIL binding' }
    }

    const { messageId } = await env.EMAIL.send({
      from,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(bcc.length ? { bcc } : {}),
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      ...(message.attachments?.length
        ? { attachments: message.attachments }
        : {}),
      ...(message.headers ? { headers: message.headers } : {}),
    })

    return messageId
      ? { ok: true, messageId }
      : { ok: false, code: 'no_message_id', reason: 'Cloudflare gave no id' }
  } catch (error) {
    // Cloudflare's errors carry a code, such as E_SENDER_NOT_VERIFIED.
    const { code, message: reason } = error as {
      code?: string
      message?: string
    }
    console.error('Email not sent:', code, reason)
    return { ok: false, code: code ?? 'unknown', reason: reason ?? '' }
  }
}

// The address replies to a mailing go to: the inbox that receives contact
// form messages, rather than the sending address. EMAIL_REPLY_TO overrides
// it, for a site that wants the two apart.
export function getReplyToAddress(): Address | null {
  return address(
    process.env.EMAIL_REPLY_TO || process.env.EMAIL_TO,
    process.env.EMAIL_FROM_NAME
  )
}

// The address that gets a copy of every message, if one is configured.
export function getBccAddress(): Address | null {
  return address(process.env.EMAIL_BCC)
}
