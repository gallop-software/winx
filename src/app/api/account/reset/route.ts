import type { NextRequest } from 'next/server'
import {
  FAILURE_STATUS,
  addressOf,
  answer,
  fieldOf,
  limit,
  readForm,
  refuse,
} from '@/utils/account-route'
import {
  issueSession,
  setSessionCookie,
  toMember,
} from '@/utils/member-session'
import { withSubscription } from '@/utils/subscribers'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/utils/member-types'
import { isMembersConfigured, resetPassword } from '@/utils/members'

export const dynamic = 'force-dynamic'

// The reset link was opened and a new password chosen. The member is logged
// in afterwards.
export async function POST(req: NextRequest) {
  if (!isMembersConfigured()) return refuse('unavailable', 503)

  const input = await readForm(req)
  if (input instanceof Response) return input

  const id = Number(fieldOf(input, 'id'))
  const key = fieldOf(input, 'key')
  const password = fieldOf(input, 'password')
  if (!Number.isInteger(id) || id <= 0 || !key || key.length > 64) {
    return refuse('link_invalid', 400)
  }
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return refuse('weak_password', 422)
  }

  const ip = addressOf(req)
  if (ip instanceof Response) return ip

  const refused = await limit('reset', ip)
  if (refused) return refused

  const result = await resetPassword({ id, key, password })
  if (!result.ok) return refuse(result.code, FAILURE_STATUS[result.code])

  const { value, session } = await issueSession(result.value, true)
  const response = answer({ member: await withSubscription(toMember(session)) })
  setSessionCookie(response, value, session)
  return response
}
