import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { isSameOrigin } from '@/utils/comment-guard'
import {
  clearSessionCookie,
  readSession,
  type MemberSession,
} from '@/utils/member-session'
import { getMember } from '@/utils/members'

// Who may press the admin buttons: an administrator, logged in on the site.
//
// The cookie says whether to show the buttons. Before anything is done,
// WordPress is asked whether that person is still an administrator with a
// session that is still current: one request per press, so a demoted
// account or a changed password is found out at once.
export async function requireAdmin(
  req: NextRequest
): Promise<{ ok: true; session: MemberSession } | { ok: false; response: NextResponse }> {
  const refuse = (status: number, message: string, expire = false) => {
    const response = NextResponse.json({ message }, { status })
    if (expire) clearSessionCookie(response)
    return { ok: false as const, response }
  }

  // A browser sends no Origin with a GET, and a GET here only reads.
  // Anything that changes something has to come from a page of this site.
  if (req.method !== 'GET' && !isSameOrigin(req)) {
    return refuse(403, 'Not from this site')
  }
  const fetchSite = req.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return refuse(403, 'Not from this site')
  }

  const session = await readSession(req)
  if (!session) return refuse(401, 'Not logged in')
  if (!session.isAdmin) return refuse(403, 'Not an administrator')

  const result = await getMember(session.id, session.version)
  if (!result.ok) {
    if (result.code === 'session_expired') return refuse(401, 'Session expired', true)
    return refuse(503, 'WordPress could not confirm the login')
  }
  if (!result.value.isAdmin) return refuse(403, 'Not an administrator')

  return { ok: true, session }
}
