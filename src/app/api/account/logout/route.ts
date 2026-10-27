import type { NextRequest } from 'next/server'
import { answer, refuse } from '@/utils/account-route'
import { isSameOrigin } from '@/utils/comment-guard'
import { clearSessionCookie } from '@/utils/member-session'

export const dynamic = 'force-dynamic'

// Ends the session in this browser. Nothing is kept on the server, so there
// is nothing else to end: a password change is what ends the others.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return refuse('rejected', 403)

  const response = answer({ loggedOut: true })
  clearSessionCookie(response)
  return response
}
