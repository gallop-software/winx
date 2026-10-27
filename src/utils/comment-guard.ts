import 'server-only'
import { DateTime } from 'luxon'
import { getDb } from '@/utils/d1'
import {
  deriveHmacKey,
  signatureBytes,
  toBase64Url,
} from '@/utils/signing'

// What stands between the comment form and WordPress: a token that proves the
// form was asked for and not answered at once, a check that the request came
// from a page of this site, and limits on how many comments one address may
// send.
//
// None of it needs a secret of its own. The keys used here are derived from
// the WordPress API key, which the site has to have anyway.

const encoder = new TextEncoder()

// --- Keys ---

type Purpose = 'token-v1' | 'ip-v1'

const SALT = 'gallop.comments'

const deriveKey = (secret: string, purpose: Purpose) =>
  deriveHmacKey(secret, SALT, purpose)

// --- Token ---

// The shortest time a person takes to write a comment, as the contact form
// has it.
export const TOKEN_MIN_AGE_MS = 3000
export const TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000

export type TokenCheck =
  | { ok: true; tokenId: string }
  | {
      ok: false
      reason: 'malformed' | 'forged' | 'wrong_post' | 'too_fresh' | 'expired'
    }

// v1.<post id>.<when issued, ms>.<random id>.<signature>
export async function issueToken(
  secret: string,
  postId: number
): Promise<string> {
  const id = toBase64Url(crypto.getRandomValues(new Uint8Array(9)))
  const payload = `v1.${postId}.${DateTime.now().toMillis()}.${id}`
  const key = await deriveKey(secret, 'token-v1')
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  )
  return `${payload}.${toBase64Url(signature)}`
}

export async function verifyToken(
  secret: string,
  token: unknown,
  postId: number
): Promise<TokenCheck> {
  if (typeof token !== 'string' || token.length > 200) {
    return { ok: false, reason: 'malformed' }
  }

  const parts = token.split('.')
  const [version, post, issued, id, signature] = parts
  if (
    parts.length !== 5 ||
    version !== 'v1' ||
    !post ||
    !issued ||
    !id ||
    !signature
  ) {
    return { ok: false, reason: 'malformed' }
  }
  if (
    !/^[1-9]\d{0,15}$/.test(post) ||
    !/^[1-9]\d{0,15}$/.test(issued) ||
    !/^[A-Za-z0-9_-]{12}$/.test(id)
  ) {
    return { ok: false, reason: 'malformed' }
  }

  const bytes = signatureBytes(signature)
  if (!bytes) return { ok: false, reason: 'malformed' }

  // The signature is checked before anything the token says is believed.
  // verify() compares in constant time, in Workers and in Node alike.
  const key = await deriveKey(secret, 'token-v1')
  const genuine = await crypto.subtle.verify(
    'HMAC',
    key,
    bytes,
    encoder.encode(`v1.${post}.${issued}.${id}`)
  )
  if (!genuine) return { ok: false, reason: 'forged' }

  if (Number(post) !== postId) return { ok: false, reason: 'wrong_post' }

  const age = DateTime.now().toMillis() - Number(issued)
  if (age < TOKEN_MIN_AGE_MS) return { ok: false, reason: 'too_fresh' }
  if (age > TOKEN_MAX_AGE_MS) return { ok: false, reason: 'expired' }

  // The id marks a token as used, not the signature: two spellings of a
  // signature can stand for the same bytes.
  return { ok: true, tokenId: id }
}

// --- Origin ---

// True when a browser sent the request from a page of this site. It stops
// another site from posting through a visitor's browser. It does not stop a
// script, which can send any header it likes: the token and the limits are
// for that.
export function isSameOrigin(req: Request): boolean {
  const fetchSite = req.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin') return false

  const origin = req.headers.get('origin')
  if (!origin || origin === 'null') return false

  let originHost: string
  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    originHost = url.host.toLowerCase()
  } catch {
    return false
  }

  const allowed = new Set<string>()
  const host = req.headers.get('host')
  if (host) allowed.add(host.toLowerCase())

  const production = process.env.NEXT_PUBLIC_PRODUCTION_URL
  if (production) {
    try {
      allowed.add(new URL(production).host.toLowerCase())
    } catch {
      // Not an address: only the Host header counts.
    }
  }

  return allowed.has(originHost)
}

// --- Address ---

// Cloudflare sets CF-Connecting-IP itself, so a visitor cannot choose it.
// X-Forwarded-For can be sent by anyone, and is only read where there is no
// Cloudflare in front: local development.
export function visitorIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf

  if (process.env.NODE_ENV !== 'production') {
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    return forwarded || '127.0.0.1'
  }

  return ''
}

// What is counted: an IPv4 address, or the /64 network of an IPv6 address,
// since one visitor can use any address within theirs.
export function ipBucket(ip: string): string {
  const value = ip.trim().toLowerCase()
  if (!value.includes(':')) return value || 'unknown'

  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped?.[1]) return mapped[1]

  const [head = '', tail = ''] = value.split('::')
  const first = head ? head.split(':') : []
  const last = tail ? tail.split(':') : []
  const groups = value.includes('::')
    ? [
        ...first,
        ...Array<string>(Math.max(0, 8 - first.length - last.length)).fill('0'),
        ...last,
      ]
    : first

  const network = groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ''))
    .join(':')
  return `${network}::/64`
}

export async function hashIp(secret: string, ip: string): Promise<string> {
  const key = await deriveKey(secret, 'ip-v1')
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(ipBucket(ip))
  )
  return toBase64Url(mac).slice(0, 22)
}

// --- Limits ---

const TEN_MINUTES_MS = 10 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000
const ONE_DAY_MS = 24 * ONE_HOUR_MS

export const LIMITS = {
  perAddressTenMinutes: 5,
  perAddressDay: 30,
  // Across every address. A limit on each address does nothing against
  // comments sent from many of them.
  siteHour: 60,
}

export type Claim =
  | { ok: true }
  | {
      ok: false
      reason: 'token_used' | 'too_fast' | 'daily_limit' | 'site_busy'
      // Seconds until it is worth trying again.
      retryAfter: number
    }

// Records one attempt, if the limits allow it and the token has not been
// used. The checks and the insert are a single statement, so two requests
// that arrive together cannot both pass.
export async function claimAttempt(input: {
  ipHash: string
  postId: number
  tokenId: string
}): Promise<Claim> {
  const db = getDb()
  const now = DateTime.now().toMillis()

  const results = await db.batch([
    db
      .prepare('DELETE FROM comment_attempts WHERE created_at < ?1')
      .bind(now - ONE_DAY_MS),
    db
      .prepare(
        `INSERT INTO comment_attempts (ip_hash, post_id, token_id, created_at)
          SELECT ?1, ?2, ?3, ?4
          WHERE NOT EXISTS
              (SELECT 1 FROM comment_attempts WHERE token_id = ?3)
            AND (SELECT COUNT(*) FROM comment_attempts
                  WHERE ip_hash = ?1 AND created_at > ?5) < ?6
            AND (SELECT COUNT(*) FROM comment_attempts
                  WHERE ip_hash = ?1 AND created_at > ?7) < ?8
            AND (SELECT COUNT(*) FROM comment_attempts
                  WHERE created_at > ?9) < ?10`
      )
      .bind(
        input.ipHash,
        input.postId,
        input.tokenId,
        now,
        now - TEN_MINUTES_MS,
        LIMITS.perAddressTenMinutes,
        now - ONE_DAY_MS,
        LIMITS.perAddressDay,
        now - ONE_HOUR_MS,
        LIMITS.siteHour
      ),
  ])

  if (results[1]?.meta?.changes === 1) return { ok: true }

  // Refused. Find out which rule it was, to say how long to wait.
  const row = await db
    .prepare(
      `SELECT
        EXISTS (SELECT 1 FROM comment_attempts WHERE token_id = ?1) AS used,
        (SELECT COUNT(*) FROM comment_attempts
          WHERE ip_hash = ?2 AND created_at > ?3) AS recent,
        (SELECT MIN(created_at) FROM comment_attempts
          WHERE ip_hash = ?2 AND created_at > ?3) AS oldest,
        (SELECT COUNT(*) FROM comment_attempts
          WHERE ip_hash = ?2 AND created_at > ?4) AS today`
    )
    .bind(
      input.tokenId,
      input.ipHash,
      now - TEN_MINUTES_MS,
      now - ONE_DAY_MS
    )
    .first<{
      used: number
      recent: number
      oldest: number | null
      today: number
    }>()

  if (row?.used) return { ok: false, reason: 'token_used', retryAfter: 0 }

  if (row && row.today >= LIMITS.perAddressDay) {
    return { ok: false, reason: 'daily_limit', retryAfter: 3600 }
  }

  if (row && row.recent >= LIMITS.perAddressTenMinutes) {
    const waitMs = (row.oldest ?? now) + TEN_MINUTES_MS - now
    return {
      ok: false,
      reason: 'too_fast',
      retryAfter: Math.max(1, Math.ceil(waitMs / 1000)),
    }
  }

  return { ok: false, reason: 'site_busy', retryAfter: 300 }
}
