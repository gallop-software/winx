import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { isSameOrigin, visitorIp } from '@/utils/comment-guard'
import {
  ACCOUNT_MESSAGES,
  type AccountErrorCode,
  type AccountFailure,
} from '@/utils/member-types'
import {
  allowAttempt,
  hashAddress,
  hashSubject,
  recordFailure,
  type AttemptKind,
} from '@/utils/member-guard'
import { readJsonObject } from '@/utils/read-body'

// What every route under /api/account does the same way: reads the form,
// turns away what did not come from a page of this site, counts attempts,
// and answers with the site's own codes and messages.

export const NO_STORE = { 'Cache-Control': 'no-store' }

const MAX_BODY_BYTES = 16 * 1024

// The contact form takes at least this long to fill in; so does a sign-up.
const MIN_FORM_MS = 3000

export function refuse(
  code: AccountErrorCode,
  status: number,
  extra: { retryAfter?: number } = {}
) {
  const body: AccountFailure = {
    ok: false,
    code,
    message: ACCOUNT_MESSAGES[code],
    ...extra,
  }
  return NextResponse.json(body, { status, headers: NO_STORE })
}

export function answer(body: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...body }, { status, headers: NO_STORE })
}

export type FormInput = Record<string, unknown>

// The fields a form sent, or a refusal. The Form component sends each field
// as { value, label }; a plain value is accepted too.
export async function readForm(
  req: NextRequest,
  options: { honeypot?: boolean } = {}
): Promise<FormInput | NextResponse> {
  if (!isSameOrigin(req)) return refuse('rejected', 403)

  const type = req.headers.get('content-type') ?? ''
  if (!type.toLowerCase().startsWith('application/json')) {
    return refuse('rejected', 415)
  }

  const input = await readJsonObject(req, MAX_BODY_BYTES)
  if (input === 'too_large' || input === null) return refuse('rejected', 400)

  if (options.honeypot) {
    // The field no person sees, and the time no person types in.
    if (fieldOf(input, 'website') !== '') return refuse('rejected', 400)
    const took = Number(input._submissionTime)
    if (Number.isFinite(took) && took < MIN_FORM_MS) return refuse('rejected', 400)
  }

  return input
}

export function fieldOf(input: FormInput, name: string): string {
  const raw = input[name]
  const value =
    raw && typeof raw === 'object' && 'value' in raw
      ? (raw as { value: unknown }).value
      : raw
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

export function flagOf(input: FormInput, name: string): boolean {
  const value = fieldOf(input, name).toLowerCase()
  return value === '1' || value === 'true' || value === 'on' || value === 'yes'
}

// The visitor's address, for WordPress to see and for the limits. A request
// with none is not from a browser this site serves.
export function addressOf(req: NextRequest): string | NextResponse {
  const ip = visitorIp(req)
  return ip || refuse('rejected', 400)
}

// Counts the attempt, or answers why not. With `failuresOnly` nothing is
// counted yet: the caller counts a failure with `countFailure()`.
export async function limit(
  kind: AttemptKind,
  ip: string,
  subject?: string,
  options: { failuresOnly?: boolean } = {}
): Promise<NextResponse | null> {
  let allowed
  try {
    allowed = await allowAttempt({
      kind,
      ipHash: await hashAddress(ip),
      ...(subject ? { subjectHash: await hashSubject(subject) } : {}),
      record: !options.failuresOnly,
    })
  } catch (error) {
    // Without the limits nothing is sent on.
    console.error('Account limits could not be checked:', error)
    return refuse('unavailable', 503)
  }
  return allowed.ok ? null : refuse('too_fast', 429, { retryAfter: allowed.retryAfter })
}

// The site-wide allowance for one kind (counted under the address 'all'),
// for what the public forms send to an address they are given: a flood
// from many addresses at once stops here.
export async function limitTotal(kind: AttemptKind): Promise<NextResponse | null> {
  let allowed
  try {
    allowed = await allowAttempt({ kind, ipHash: 'all' })
  } catch (error) {
    console.error('Account limits could not be checked:', error)
    return refuse('unavailable', 503)
  }
  return allowed.ok ? null : refuse('too_fast', 429, { retryAfter: allowed.retryAfter })
}

export async function countFailure(
  kind: AttemptKind,
  ip: string,
  subject?: string
): Promise<void> {
  try {
    await recordFailure({
      kind,
      ipHash: await hashAddress(ip),
      ...(subject ? { subjectHash: await hashSubject(subject) } : {}),
    })
  } catch (error) {
    console.error('A failed attempt could not be counted:', error)
  }
}

// The status a failure from WordPress is answered with.
export const FAILURE_STATUS: Record<AccountErrorCode, number> = {
  rejected: 400,
  invalid_credentials: 401,
  invalid_email: 422,
  invalid_name: 422,
  weak_password: 422,
  wrong_password: 403,
  email_taken: 409,
  exists: 409,
  link_invalid: 400,
  too_fast: 429,
  session_expired: 401,
  unavailable: 503,
  failed: 502,
}

export function userAgentOf(req: NextRequest): string {
  return (req.headers.get('user-agent') ?? '').slice(0, 254)
}
