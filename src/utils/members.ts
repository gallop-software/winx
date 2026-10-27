import 'server-only'
import { getCommentSecret } from '@/utils/comments'
import type { AccountErrorCode, MemberProfile } from '@/utils/member-types'
import {
  WordPressBusyError,
  WordPressUnknownOutcomeError,
  fetchWordPress,
  postWordPress,
} from '@/utils/wp-fetch'

// What the site asks WordPress about members, through the Gallop plugin's
// members routes. Every call carries the API key: the plugin only listens
// to the site's own server. WordPress is asked when a member logs in, has
// confirmed a new account, or changes something, and never for a page view.

const ROUTE = '/gallop/v1/members'
const KEY_HEADER = 'X-Gallop-WP-Key'

// A member as the plugin returns one. Whether they get email is not read
// from WordPress: that is the mailing list's (src/utils/subscribers.ts).
export type MemberPayload = {
  id: number
  username: string
  displayName: string
  firstName: string
  lastName: string
  avatar: string
  isAdmin: boolean
  replyEmails: boolean
  verified: boolean
  sessionVersion: number
  email?: string
}

export type MemberResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: AccountErrorCode; retryAfter?: number }

export type ConfirmOutcome = {
  loggedIn: boolean
  existing: boolean
  member?: MemberPayload
}

export type ProfileChanges = {
  displayName?: string
  firstName?: string
  lastName?: string
  email?: string
  currentPassword?: string
  newPassword?: string
  replyEmails?: boolean
}

// What the plugin answers with, mapped to the site's own codes. Anything
// about the key or the plugin's setup is the owner's problem, not the
// member's, and is logged rather than shown.
const CODES: Record<string, AccountErrorCode> = {
  gallop_member_invalid_credentials: 'invalid_credentials',
  gallop_member_rate_limited: 'too_fast',
  gallop_member_invalid_email: 'invalid_email',
  gallop_member_invalid_name: 'invalid_name',
  gallop_member_weak_password: 'weak_password',
  gallop_member_wrong_password: 'wrong_password',
  gallop_member_email_taken: 'email_taken',
  gallop_member_exists: 'exists',
  gallop_member_link_invalid: 'link_invalid',
  gallop_member_session_invalid: 'session_expired',
}

const SETUP_PROBLEMS = new Set([
  'gallop_key_missing',
  'gallop_key_invalid',
  'gallop_key_forbidden',
  'gallop_key_rate_limited',
  'gallop_https_required',
  'gallop_member_front_end_missing',
  'rest_no_route',
])

export function isMembersConfigured(): boolean {
  return getCommentSecret() !== ''
}

function payloadOf(value: unknown): MemberPayload | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.id !== 'number' || !Number.isInteger(raw.id) || raw.id <= 0) {
    return null
  }
  const text = (key: string) => (typeof raw[key] === 'string' ? raw[key] : '')
  const version = Number(raw.sessionVersion)

  return {
    id: raw.id,
    username: text('username'),
    displayName: text('displayName') || text('username'),
    firstName: text('firstName'),
    lastName: text('lastName'),
    avatar: text('avatar').startsWith('https://') ? text('avatar') : '',
    isAdmin: raw.isAdmin === true,
    replyEmails: raw.replyEmails === true,
    verified: raw.verified === true,
    sessionVersion: Number.isInteger(version) && version > 0 ? version : 1,
    ...(typeof raw.email === 'string' ? { email: raw.email } : {}),
  }
}

export function toProfile(member: MemberPayload): MemberProfile {
  return {
    id: member.id,
    name: member.displayName,
    avatar: member.avatar,
    isAdmin: member.isAdmin,
    // Filled in from the mailing list by the profile route.
    subscribed: false,
    username: member.username,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email ?? '',
    replyEmails: member.replyEmails,
    verified: member.verified,
  }
}

async function call(
  path: string,
  body: unknown,
  method: 'POST' | 'PATCH' = 'POST'
): Promise<MemberResult<Record<string, unknown>>> {
  const key = getCommentSecret()
  if (!key) return { ok: false, code: 'unavailable' }

  let answer: { status: number; body: unknown }
  try {
    answer = await postWordPress(path, body, { [KEY_HEADER]: key }, method)
  } catch (error) {
    if (error instanceof WordPressBusyError) {
      return { ok: false, code: 'unavailable', retryAfter: error.retryAfter }
    }
    if (error instanceof WordPressUnknownOutcomeError) {
      console.error('No answer from WordPress about a member:', error.message)
      return { ok: false, code: 'unavailable' }
    }
    throw error
  }

  return read(answer.status, answer.body)
}

function read(
  status: number,
  body: unknown
): MemberResult<Record<string, unknown>> {
  const data =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const code = typeof data.code === 'string' ? data.code : ''

  if (status >= 200 && status < 300 && !code) return { ok: true, value: data }

  if (SETUP_PROBLEMS.has(code)) {
    // The status and code only. The key is never logged.
    console.error(`WordPress refused the site's members request: ${status} ${code}`)
    return { ok: false, code: 'unavailable' }
  }

  const mapped = CODES[code]
  if (mapped) return { ok: false, code: mapped }

  console.error(`WordPress refused a members request: ${status} ${code}`)
  return { ok: false, code: 'failed' }
}

function member(
  result: MemberResult<Record<string, unknown>>
): MemberResult<MemberPayload> {
  if (!result.ok) return result
  const payload = payloadOf(result.value.member)
  return payload ? { ok: true, value: payload } : { ok: false, code: 'failed' }
}

// --- Calls ---

export async function loginMember(input: {
  login: string
  password: string
  ip: string
  userAgent: string
}): Promise<MemberResult<MemberPayload>> {
  return member(await call(`${ROUTE}/login`, input))
}

// Creates the member for an address the site has confirmed itself
// (src/utils/account-confirm.ts), with the password they chose. WordPress
// sends no email and checks nothing about the address: only call this for a
// sign-up link that was read and found genuine.
export async function createMember(input: {
  email: string
  firstName: string
  lastName: string
  password: string
}): Promise<MemberResult<MemberPayload>> {
  return member(await call(`${ROUTE}/create`, input))
}

// The link WordPress emails an existing member who changed their address.
export async function confirmMember(input: {
  id: string
  key: string
}): Promise<MemberResult<ConfirmOutcome>> {
  const result = await call(`${ROUTE}/confirm`, input)
  if (!result.ok) return result

  const payload = payloadOf(result.value.member)
  return {
    ok: true,
    value: {
      loggedIn: result.value.loggedIn === true && payload !== null,
      existing: result.value.existing === true,
      ...(payload ? { member: payload } : {}),
    },
  }
}

export async function requestPasswordReset(input: {
  login: string
  ip: string
}): Promise<MemberResult<true>> {
  const result = await call(`${ROUTE}/reset-request`, input)
  return result.ok ? { ok: true, value: true } : result
}

export async function resetPassword(input: {
  id: number
  key: string
  password: string
}): Promise<MemberResult<MemberPayload>> {
  return member(await call(`${ROUTE}/reset`, input))
}

// The member as WordPress has them now, with the email. Also how the site
// checks, before an administrator's action, that they still are one.
export async function getMember(
  id: number,
  sessionVersion: number
): Promise<MemberResult<MemberPayload>> {
  const key = getCommentSecret()
  if (!key) return { ok: false, code: 'unavailable' }

  let res: Response
  try {
    res = await fetchWordPress(
      `${ROUTE}/${id}`,
      { sessionVersion: String(sessionVersion) },
      { [KEY_HEADER]: key }
    )
  } catch (error) {
    if (error instanceof WordPressBusyError) {
      return { ok: false, code: 'unavailable', retryAfter: error.retryAfter }
    }
    throw error
  }

  const body: unknown = await res.json().catch(() => null)
  return member(read(res.status, body))
}

export async function updateMember(
  id: number,
  sessionVersion: number,
  changes: ProfileChanges
): Promise<MemberResult<MemberPayload>> {
  return member(
    await call(`${ROUTE}/${id}`, { sessionVersion, ...changes }, 'PATCH')
  )
}
