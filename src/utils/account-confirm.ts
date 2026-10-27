import 'server-only'
import { DateTime } from 'luxon'
import { baseURL } from '@/app/metadata'
import { getCommentSecret } from '@/utils/comments'
import { renderAccountConfirmationEmail } from '@/utils/email-template'
import { NAME_MAX_LENGTH } from '@/utils/member-types'
import { getReplyToAddress, sendEmailMessage, type SendResult } from '@/utils/send-email'
import { deriveHmacKey, signText, verifyText } from '@/utils/signing'
import { normaliseEmail } from '@/utils/subscribers'

// The confirmation someone is sent before they have an account: a link
// signed for that address and those names, good for two days. The site sends
// it and checks it; WordPress is only asked to create the member once the
// link has been opened and a password chosen.
//
// Nothing is stored for a sign-up. The link carries what was typed, and the
// signature says the site wrote it. So a link is not used up by being
// opened: what makes it work once is that the account then exists, and
// WordPress refuses to create it a second time.

const SALT = 'gallop.members'
const PURPOSE = 'signup-confirm-v1'
const VALID_FOR_SECONDS = 48 * 60 * 60

export type SignUp = { email: string; firstName: string; lastName: string }

function key(): Promise<CryptoKey> {
  return deriveHmacKey(getCommentSecret(), SALT, PURPOSE)
}

// A name on one line and no longer than WordPress keeps. Cleaning a clean
// name changes nothing, so what was signed is what is read back.
function cleanName(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').slice(0, NAME_MAX_LENGTH).trim()
    : ''
}

function signed(signUp: SignUp, issued: number): string {
  return `${signUp.email}\n${signUp.firstName}\n${signUp.lastName}\n${issued}`
}

export async function signUpUrl(input: SignUp): Promise<string> {
  const signUp = {
    email: normaliseEmail(input.email),
    firstName: cleanName(input.firstName),
    lastName: cleanName(input.lastName),
  }
  const issued = Math.floor(DateTime.now().toSeconds())
  const signature = await signText(await key(), signed(signUp, issued))
  const query = new URLSearchParams({
    e: signUp.email,
    f: signUp.firstName,
    l: signUp.lastName,
    t: String(issued),
    s: signature,
  })
  return `${baseURL}/account/confirm/?${query}`
}

// The sign-up a link was made for, or why it is no good.
export async function readSignUp(input: {
  e: unknown
  f: unknown
  l: unknown
  t: unknown
  s: unknown
}): Promise<SignUp | 'expired' | null> {
  const issued = Number(input.t)
  const signUp = {
    email: normaliseEmail(input.e),
    firstName: cleanName(input.f),
    lastName: cleanName(input.l),
  }
  if (!Number.isInteger(issued) || issued <= 0 || !signUp.email) return null
  if (typeof input.s !== 'string' || !getCommentSecret()) return null

  const genuine = await verifyText(await key(), signed(signUp, issued), input.s)
  if (!genuine) return null
  if (Math.floor(DateTime.now().toSeconds()) - issued > VALID_FOR_SECONDS) return 'expired'
  return signUp
}

// Sends the email that asks them to confirm.
export async function sendSignUpConfirmation(input: SignUp): Promise<SendResult> {
  const url = await signUpUrl(input)
  const message = renderAccountConfirmationEmail({ firstName: cleanName(input.firstName), url })
  const replyTo = getReplyToAddress()
  return sendEmailMessage({
    to: normaliseEmail(input.email),
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(replyTo ? { replyTo } : {}),
  })
}
