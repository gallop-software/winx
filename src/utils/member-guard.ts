import 'server-only'
import { DateTime } from 'luxon'
import { getDb } from '@/utils/d1'
import { deriveHmacKey, toBase64Url } from '@/utils/signing'
import { ipBucket } from '@/utils/comment-guard'

// Limits on the account routes: how many times one address, or one account,
// may try something in a while. WordPress has limits of its own behind
// these; these keep a flood from reaching it, and cost one database
// statement.
//
// What is counted is stored as a keyed hash: never an address, never an
// email or username.

const SALT = 'gallop.members'

export type AttemptKind =
  | 'login'
  | 'signup'
  | 'forgot'
  | 'reset'
  | 'confirm'
  // Joining the mailing list, which sends a confirmation email.
  | 'newsletter'
  // A message through the contact form, which emails the site's inbox.
  | 'contact'
  // The demo toolbar's post email: one a day per visitor and per inbox.
  | 'demo-email'
  // The demo's FlowTrace test report: a few a day per visitor (each inbox
  // gets one ever, in demo_sends).
  | 'demo-report'
  // Every demo email sent, by everyone: counted under one address, 'all'.
  | 'demo-email-total'
  // Every confirmation email the public forms send (newsletter and
  // account), by everyone: counted under one address, 'all'.
  | 'confirm-total'
  // A converted visit sent to /api/flow-trace and stored. Its report email
  // has limits of its own (flowTraceConfig).
  | 'flowtrace'

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

// Per kind: how many from one address in a window, and how many for one
// subject (an account) in a window.
const LIMITS: Record<
  AttemptKind,
  { address: [number, number]; subject?: [number, number] }
> = {
  login: { address: [10, 15 * MINUTE_MS], subject: [20, HOUR_MS] },
  signup: { address: [5, HOUR_MS], subject: [3, HOUR_MS] },
  newsletter: { address: [5, HOUR_MS], subject: [3, HOUR_MS] },
  contact: { address: [5, HOUR_MS] },
  'demo-email': { address: [1, DAY_MS], subject: [1, DAY_MS] },
  'demo-report': { address: [5, DAY_MS] },
  'demo-email-total': { address: [40, DAY_MS] },
  'confirm-total': { address: [200, DAY_MS] },
  flowtrace: { address: [30, HOUR_MS] },
  forgot: { address: [5, HOUR_MS], subject: [3, HOUR_MS] },
  reset: { address: [10, HOUR_MS] },
  confirm: { address: [10, HOUR_MS] },
}

async function hash(purpose: string, value: string): Promise<string> {
  const key = await deriveHmacKey(getSecret(), SALT, purpose)
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value)
  )
  return toBase64Url(mac).slice(0, 22)
}

function getSecret(): string {
  return (process.env.GALLOP_WP_API_KEY ?? '').trim()
}

export function hashAddress(ip: string): Promise<string> {
  return hash('address-v1', ipBucket(ip))
}

// An email address or username, as typed, made comparable.
export function hashSubject(subject: string): Promise<string> {
  return hash('subject-v1', subject.trim().toLowerCase())
}

export type Allowed = { ok: true } | { ok: false; retryAfter: number }

// Whether the limits allow one more attempt, and, unless told otherwise,
// records it. The checks and the insert are a single statement, so two
// requests that arrive together cannot both pass. Rows older than a day are
// removed as it goes.
//
// A login is not recorded here: only a failed one counts, through
// recordFailure(), so people logging in from one office do not lock each
// other out. Everything that sends an email counts whatever the outcome.
export async function allowAttempt(input: {
  kind: AttemptKind
  ipHash: string
  subjectHash?: string
  record?: boolean
}): Promise<Allowed> {
  const db = getDb()
  const now = DateTime.now().toMillis()
  const limit = LIMITS[input.kind]
  const subject = input.subjectHash ?? ''
  const [subjectMax, subjectWindow] = limit.subject ?? [0, 0]
  const record = input.record !== false

  const results = await db.batch([
    db
      .prepare('DELETE FROM member_attempts WHERE created_at < ?1')
      .bind(now - DAY_MS),
    db
      .prepare(
        `INSERT INTO member_attempts (kind, ip_hash, subject_hash, created_at)
          SELECT ?1, ?2, ?3, ?4
          WHERE ?10 = 1
            AND (SELECT COUNT(*) FROM member_attempts
                  WHERE kind = ?1 AND ip_hash = ?2 AND created_at > ?5) < ?6
            AND (?7 = '' OR (SELECT COUNT(*) FROM member_attempts
                  WHERE kind = ?1 AND subject_hash = ?7 AND created_at > ?8) < ?9)`
      )
      .bind(
        input.kind,
        input.ipHash,
        subject,
        now,
        now - limit.address[1],
        limit.address[0],
        subject,
        now - subjectWindow,
        subjectMax,
        record ? 1 : 0
      ),
    db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM member_attempts
            WHERE kind = ?1 AND ip_hash = ?2 AND created_at > ?3) AS address,
          (SELECT COUNT(*) FROM member_attempts
            WHERE kind = ?1 AND subject_hash = ?4 AND created_at > ?5) AS subject`
      )
      .bind(
        input.kind,
        input.ipHash,
        now - limit.address[1],
        subject,
        now - subjectWindow
      ),
  ])

  if (record) {
    if (results[1]?.meta?.changes === 1) return { ok: true }
  } else {
    const counts = results[2]?.results?.[0] as
      | { address: number; subject: number }
      | undefined
    const underAddress = (counts?.address ?? 0) < limit.address[0]
    const underSubject = subject === '' || (counts?.subject ?? 0) < subjectMax
    if (underAddress && underSubject) return { ok: true }
  }

  return {
    ok: false,
    retryAfter: Math.ceil(Math.max(limit.address[1], subjectWindow) / 1000),
  }
}

// Counts a failed attempt that allowAttempt() was told not to record.
export async function recordFailure(input: {
  kind: AttemptKind
  ipHash: string
  subjectHash?: string
}): Promise<void> {
  await getDb()
    .prepare(
      'INSERT INTO member_attempts (kind, ip_hash, subject_hash, created_at) VALUES (?1, ?2, ?3, ?4)'
    )
    .bind(
      input.kind,
      input.ipHash,
      input.subjectHash ?? '',
      DateTime.now().toMillis()
    )
    .run()
}

// Gives back the latest attempt allowAttempt() recorded, for something that
// then did not happen (an email that could not be sent), so it does not count.
export async function refundAttempt(input: {
  kind: AttemptKind
  ipHash: string
  subjectHash?: string
}): Promise<void> {
  await getDb()
    .prepare(
      `DELETE FROM member_attempts WHERE id = (
        SELECT id FROM member_attempts
          WHERE kind = ?1 AND ip_hash = ?2 AND subject_hash = ?3
          ORDER BY created_at DESC, id DESC LIMIT 1)`
    )
    .bind(input.kind, input.ipHash, input.subjectHash ?? '')
    .run()
}
