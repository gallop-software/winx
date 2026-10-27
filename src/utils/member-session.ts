import 'server-only'
import { DateTime } from 'luxon'
import type { NextRequest, NextResponse } from 'next/server'
import { getCommentSecret } from '@/utils/comments'
import type { Member } from '@/utils/member-types'
import type { MemberPayload } from '@/utils/members'
import {
  deriveHmacKey,
  fromBase64Url,
  signText,
  toBase64Url,
  verifyText,
} from '@/utils/signing'

// The session a logged-in member's browser holds: a signed cookie the site
// checks by itself, so a page view by a member never asks WordPress.
//
// The cookie carries who the member is, what to show them, and the session
// version WordPress gave them. Not whether they get email: that is the
// mailing list's to say (src/utils/subscribers.ts), and can change from an
// email without the member being here. WordPress refuses a call with an older
// version, which is how a password change ends every other browser.
//
// v1.<base64url json>.<signature>. The signature is over the bytes as
// sent, so nothing is serialised twice.

export const MEMBER_COOKIE = 'gallop_member'

const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000
const SESSION_MS = 24 * 60 * 60 * 1000
const MAX_COOKIE_LENGTH = 2048

const SALT = 'gallop.members'
const PURPOSE = 'session-v1'

export type MemberSession = Member & {
  version: number
  remember: boolean
  expiresAt: number
}

// What the cookie holds. Short keys: it travels with every request.
type Claims = {
  v: 1
  id: number
  n: string
  a: string
  ad: boolean
  sv: number
  r: boolean
  exp: number
}

function key() {
  return deriveHmacKey(getCommentSecret(), SALT, PURPOSE)
}

export async function issueSession(
  member: MemberPayload,
  remember: boolean
): Promise<{ value: string; session: MemberSession }> {
  const now = DateTime.now().toMillis()
  const expiresAt = now + (remember ? REMEMBER_MS : SESSION_MS)

  const claims: Claims = {
    v: 1,
    id: member.id,
    n: member.displayName,
    a: member.avatar,
    ad: member.isAdmin,
    sv: member.sessionVersion,
    r: remember,
    exp: expiresAt,
  }
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(claims)))
  const signature = await signText(await key(), `v1.${body}`)

  return {
    value: `v1.${body}.${signature}`,
    session: {
      id: member.id,
      name: member.displayName,
      avatar: member.avatar,
      isAdmin: member.isAdmin,
      subscribed: false,
      version: member.sessionVersion,
      remember,
      expiresAt,
    },
  }
}

// The session the request carries, if it is genuine and not run out.
export async function readSession(
  req: NextRequest
): Promise<MemberSession | null> {
  const value = req.cookies.get(MEMBER_COOKIE)?.value
  if (!value || value.length > MAX_COOKIE_LENGTH) return null
  if (!getCommentSecret()) return null

  const parts = value.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1' || !parts[1] || !parts[2]) {
    return null
  }

  // The signature is checked before anything the cookie says is believed.
  const genuine = await verifyText(await key(), `v1.${parts[1]}`, parts[2])
  if (!genuine) return null

  const bytes = fromBase64Url(parts[1])
  if (!bytes) return null

  let claims: Partial<Claims>
  try {
    claims = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Claims>
  } catch {
    return null
  }

  if (
    claims.v !== 1 ||
    typeof claims.id !== 'number' ||
    !Number.isInteger(claims.id) ||
    claims.id <= 0 ||
    typeof claims.n !== 'string' ||
    typeof claims.a !== 'string' ||
    typeof claims.sv !== 'number' ||
    typeof claims.exp !== 'number'
  ) {
    return null
  }
  if (claims.exp <= DateTime.now().toMillis()) return null

  return {
    id: claims.id,
    name: claims.n,
    avatar: claims.a,
    isAdmin: claims.ad === true,
    subscribed: false,
    version: claims.sv,
    remember: claims.r === true,
    expiresAt: claims.exp,
  }
}

export function setSessionCookie(
  res: NextResponse,
  value: string,
  session: MemberSession
) {
  res.cookies.set(MEMBER_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Without "remember me" the cookie lasts the browser session, and the
    // expiry inside it is what counts.
    ...(session.remember
      ? { maxAge: Math.floor((session.expiresAt - DateTime.now().toMillis()) / 1000) }
      : {}),
  })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(MEMBER_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

// The member as the browser is told about them. `subscribed` is false here;
// routes fill it in from the mailing list with withSubscription().
export function toMember(session: MemberSession): Member {
  return {
    id: session.id,
    name: session.name,
    avatar: session.avatar,
    isAdmin: session.isAdmin,
    subscribed: session.subscribed,
  }
}
