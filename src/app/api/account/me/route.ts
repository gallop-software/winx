import { NextResponse, type NextRequest } from 'next/server'
import { NO_STORE } from '@/utils/account-route'
import {
  clearSessionCookie,
  readSession,
  toMember,
} from '@/utils/member-session'
import { withSubscription } from '@/utils/subscribers'

export const dynamic = 'force-dynamic'

// Who the browser is logged in as, from the cookie, and whether they are on
// the mailing list. Asked once per page load, and never reaches WordPress.
export async function GET(req: NextRequest) {
  const session = await readSession(req)
  const member = session ? await withSubscription(toMember(session)) : null
  const response = NextResponse.json(
    { member },
    { headers: NO_STORE }
  )
  // A cookie that no longer checks out is removed, so it is not sent again.
  if (!session && req.cookies.has('gallop_member')) clearSessionCookie(response)
  return response
}
