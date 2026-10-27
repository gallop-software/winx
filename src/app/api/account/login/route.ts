import type { NextRequest } from 'next/server'
import {
  FAILURE_STATUS,
  addressOf,
  answer,
  countFailure,
  fieldOf,
  flagOf,
  limit,
  readForm,
  refuse,
  userAgentOf,
} from '@/utils/account-route'
import {
  issueSession,
  setSessionCookie,
  toMember,
} from '@/utils/member-session'
import { withSubscription } from '@/utils/subscribers'
import { isMembersConfigured, loginMember } from '@/utils/members'

export const dynamic = 'force-dynamic'

const LOGIN_MAX = 254
const PASSWORD_MAX = 4096

// A member logging in. WordPress checks the password; the site issues the
// session.
export async function POST(req: NextRequest) {
  if (!isMembersConfigured()) return refuse('unavailable', 503)

  const input = await readForm(req)
  if (input instanceof Response) return input

  const login = fieldOf(input, 'login')
  const password = fieldOf(input, 'password')
  const remember = flagOf(input, 'remember')
  if (
    !login ||
    !password ||
    login.length > LOGIN_MAX ||
    password.length > PASSWORD_MAX
  ) {
    return refuse('invalid_credentials', 401)
  }

  const ip = addressOf(req)
  if (ip instanceof Response) return ip

  // Only a wrong password counts, so people logging in from one address do
  // not lock each other out.
  const refused = await limit('login', ip, login, { failuresOnly: true })
  if (refused) return refused

  const result = await loginMember({
    login,
    password,
    ip,
    userAgent: userAgentOf(req),
  })
  if (!result.ok) {
    if (result.code === 'invalid_credentials') await countFailure('login', ip, login)
    return refuse(result.code, FAILURE_STATUS[result.code], {
      ...(result.retryAfter ? { retryAfter: result.retryAfter } : {}),
    })
  }

  const { value, session } = await issueSession(result.value, remember)
  const response = answer({ member: await withSubscription(toMember(session)) })
  setSessionCookie(response, value, session)
  return response
}
