import type { NextRequest } from 'next/server'
import { addressOf, answer, fieldOf, limit, limitTotal, readForm, refuse } from '@/utils/account-route'
import { getCommentSecret } from '@/utils/comments'
import { NAME_MAX_LENGTH } from '@/utils/member-types'
import { sendConfirmation } from '@/utils/newsletter'
import { inboxOf, isEmail } from '@/utils/send-email'
import { requestSubscription } from '@/utils/subscribers'

export const dynamic = 'force-dynamic'

const EMAIL_MAX = 254

// Joining the mailing list from the form on the site. Nothing is sent to
// the address but a confirmation, and it goes on the list only once that
// link is used. The answer is the same whether or not the address is
// already on the list, so the form cannot be used to find out who is.
export async function POST(req: NextRequest) {
  // The confirmation link is signed with a key derived from this.
  if (!getCommentSecret()) return refuse('unavailable', 503)

  const input = await readForm(req, { honeypot: true })
  if (input instanceof Response) return input

  const email = fieldOf(input, 'email')
  if (!email || email.length > EMAIL_MAX || !isEmail(email)) {
    return refuse('invalid_email', 422)
  }

  const ip = addressOf(req)
  if (ip instanceof Response) return ip

  const refused =
    (await limit('newsletter', ip, inboxOf(email))) ?? (await limitTotal('confirm-total'))
  if (refused) return refused

  const pending = await requestSubscription({
    email,
    firstName: fieldOf(input, 'firstName').slice(0, NAME_MAX_LENGTH),
    lastName: fieldOf(input, 'lastName').slice(0, NAME_MAX_LENGTH),
    source: 'signup',
  })
  if (pending) {
    const sent = await sendConfirmation(pending)
    if (!sent.ok) {
      console.error(`A subscription confirmation was not sent: ${sent.code}`)
      return refuse('failed', 502)
    }
  }

  return answer({ message: 'Check your email for a link to confirm your subscription.' }, 202)
}
