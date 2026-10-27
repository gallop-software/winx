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
import { isMembersConfigured, requestPasswordReset } from '@/utils/members'

export const dynamic = 'force-dynamic'

const LOGIN_MAX = 254

// "Forgot password?". The answer is the same whether or not the account
// exists.
export async function POST(req: NextRequest) {
  if (!isMembersConfigured()) return refuse('unavailable', 503)

  const input = await readForm(req, { honeypot: true })
  if (input instanceof Response) return input

  const login = fieldOf(input, 'login')
  if (!login || login.length > LOGIN_MAX) return refuse('invalid_email', 422)

  const ip = addressOf(req)
  if (ip instanceof Response) return ip

  const refused = await limit('forgot', ip, login)
  if (refused) return refused

  const result = await requestPasswordReset({ login, ip })
  if (!result.ok) return refuse(result.code, FAILURE_STATUS[result.code])

  return answer(
    {
      message:
        'If there is an account for that address, an email with a link to choose a new password is on its way.',
    },
    202
  )
}
