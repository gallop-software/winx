import type { NextRequest } from 'next/server'
import { readSignUp } from '@/utils/account-confirm'
import {
  FAILURE_STATUS,
  addressOf,
  answer,
  fieldOf,
  limit,
  readForm,
  refuse,
  type FormInput,
} from '@/utils/account-route'
import {
  issueSession,
  setSessionCookie,
  toMember,
} from '@/utils/member-session'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/utils/member-types'
import { withSubscription } from '@/utils/subscribers'
import {
  confirmMember,
  createMember,
  isMembersConfigured,
  type MemberPayload,
} from '@/utils/members'

export const dynamic = 'force-dynamic'

// A confirmation link was opened and its form sent. There are two kinds.
//
// A sign-up link is the site's own (src/utils/account-confirm.ts) and comes
// with the password just chosen: the member is created in WordPress, already
// confirmed, and logged in.
//
// A link with an id and a key is WordPress's, emailed to a member who changed
// their address: the account is only marked confirmed.
export async function POST(req: NextRequest) {
  if (!isMembersConfigured()) return refuse('unavailable', 503)

  const input = await readForm(req)
  if (input instanceof Response) return input

  return fieldOf(input, 's') ? signUp(req, input) : existing(req, input)
}

async function loggedIn(member: MemberPayload) {
  const { value, session } = await issueSession(member, true)
  const response = answer({
    loggedIn: true,
    existing: false,
    member: await withSubscription(toMember(session)),
  })
  setSessionCookie(response, value, session)
  return response
}

async function signUp(req: NextRequest, input: FormInput) {
  const password = fieldOf(input, 'password')
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return refuse('weak_password', 422)
  }

  const ip = addressOf(req)
  if (ip instanceof Response) return ip

  const refused = await limit('confirm', ip)
  if (refused) return refused

  const link = await readSignUp({
    e: fieldOf(input, 'e'),
    f: fieldOf(input, 'f'),
    l: fieldOf(input, 'l'),
    t: fieldOf(input, 't'),
    s: fieldOf(input, 's'),
  })
  if (link === null || link === 'expired') return refuse('link_invalid', 400)

  // An address that already has an account is refused here ('exists'), which
  // is also what a link opened a second time meets.
  const result = await createMember({ ...link, password })
  if (!result.ok) return refuse(result.code, FAILURE_STATUS[result.code])

  return loggedIn(result.value)
}

async function existing(req: NextRequest, input: FormInput) {
  const id = fieldOf(input, 'id')
  const key = fieldOf(input, 'key')
  if (!/^[0-9a-f]{64}$/.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(key)) {
    return refuse('link_invalid', 400)
  }

  const ip = addressOf(req)
  if (ip instanceof Response) return ip

  const refused = await limit('confirm', ip)
  if (refused) return refused

  const result = await confirmMember({ id, key })
  if (!result.ok) return refuse(result.code, FAILURE_STATUS[result.code])

  // A sign-up WordPress was sent before the site confirmed them itself: the
  // account is new, and has no password until they ask to reset it.
  const outcome = result.value
  if (outcome.loggedIn && outcome.member) return loggedIn(outcome.member)

  return answer({
    loggedIn: false,
    existing: outcome.existing,
  })
}
