import 'server-only'
import { DateTime } from 'luxon'
import { baseURL } from '@/app/metadata'
import { getCommentSecret } from '@/utils/comments'
import { renderConfirmationEmail } from '@/utils/email-template'
import { normaliseEmail } from '@/utils/subscribers'
import { getReplyToAddress, sendEmailMessage, type SendResult } from '@/utils/send-email'
import { deriveHmacKey, signText, verifyText } from '@/utils/signing'

// The confirmation an address is sent before it goes on the mailing list:
// a link signed for that subscriber and that address, good for a week.
// Without it, anyone could put anyone else's address on the list.

const SALT = 'gallop.mailing'
const PURPOSE = 'newsletter-confirm-v1'
const VALID_FOR_SECONDS = 7 * 24 * 60 * 60

function key(): Promise<CryptoKey> {
  return deriveHmacKey(getCommentSecret(), SALT, PURPOSE)
}

function signed(id: number, email: string, issued: number): string {
  return `${id}\n${normaliseEmail(email)}\n${issued}`
}

export async function confirmationUrl(id: number, email: string): Promise<string> {
  const issued = Math.floor(DateTime.now().toSeconds())
  const signature = await signText(await key(), signed(id, email, issued))
  const query = new URLSearchParams({ i: String(id), e: normaliseEmail(email), t: String(issued), s: signature })
  return `${baseURL}/newsletter/confirm/?${query}`
}

export type ConfirmationLink = { id: number; email: string }

// The subscriber and address a link was made for, or why it is no good.
export async function readConfirmation(input: {
  i: unknown
  e: unknown
  t: unknown
  s: unknown
}): Promise<ConfirmationLink | 'expired' | null> {
  const id = Number(input.i)
  const issued = Number(input.t)
  const email = normaliseEmail(input.e)
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(issued) || !email) return null
  if (typeof input.s !== 'string' || !getCommentSecret()) return null

  const genuine = await verifyText(await key(), signed(id, email, issued), input.s)
  if (!genuine) return null
  if (Math.floor(DateTime.now().toSeconds()) - issued > VALID_FOR_SECONDS) return 'expired'
  return { id, email }
}

// Sends the email that asks them to confirm.
export async function sendConfirmation(subscriber: {
  id: number
  email: string
  firstName: string
}): Promise<SendResult> {
  const url = await confirmationUrl(subscriber.id, subscriber.email)
  const message = renderConfirmationEmail({ firstName: subscriber.firstName, url })
  const replyTo = getReplyToAddress()
  return sendEmailMessage({
    to: subscriber.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(replyTo ? { replyTo } : {}),
  })
}
