import type { NextRequest } from 'next/server'
import { sendSignUpConfirmation } from '@/utils/account-confirm'
import {
  addressOf,
  answer,
  fieldOf,
  limit,
  limitTotal,
  readForm,
  refuse,
} from '@/utils/account-route'
import { NAME_MAX_LENGTH } from '@/utils/member-types'
import { isMembersConfigured } from '@/utils/members'
import { inboxOf, isEmail } from '@/utils/send-email'

export const dynamic = 'force-dynamic'

const EMAIL_MAX = 254

// Asking for an account, to log in and comment. It has nothing to do with
// the mailing list (/api/newsletter/subscribe). The site emails a link and
// that is all: nothing is created, here or in WordPress, until the link is
// opened and a password chosen (/api/account/confirm). The answer is the
// same whether or not the address already has an account; that is only said
// to whoever opens the link.
export async function POST(req: NextRequest) {
  if (!isMembersConfigured()) return refuse('unavailable', 503)

  const input = await readForm(req, { honeypot: true })
  if (input instanceof Response) return input

  const email = fieldOf(input, 'email')
  if (!email || email.length > EMAIL_MAX || !isEmail(email)) {
    return refuse('invalid_email', 422)
  }
  const firstName = fieldOf(input, 'firstName').slice(0, NAME_MAX_LENGTH)
  const lastName = fieldOf(input, 'lastName').slice(0, NAME_MAX_LENGTH)

  const ip = addressOf(req)
  if (ip instanceof Response) return ip

  const refused =
    (await limit('signup', ip, inboxOf(email))) ?? (await limitTotal('confirm-total'))
  if (refused) return refused

  const sent = await sendSignUpConfirmation({ email, firstName, lastName })
  if (!sent.ok) {
    console.error(`An account confirmation was not sent: ${sent.code}`)
    return refuse('failed', 502)
  }

  return answer(
    { message: 'Check your email for a link to confirm your address.' },
    202
  )
}
