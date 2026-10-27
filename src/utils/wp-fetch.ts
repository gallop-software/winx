import 'server-only'
import { DateTime } from 'luxon'

const wpJson = process.env.NEXT_PUBLIC_WORDPRESS_URL
  ? `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json`
  : undefined

// The host refuses bursts of requests with 429, and answers 502 to 504 while
// it is busy. Both pass, so the request is tried again after a wait.
const RETRY_STATUSES = new Set([429, 502, 503, 504])
const RETRY_WAITS_MS = [1000, 2000, 4000, 8000]
const MAX_RETRY_AFTER_MS = 20000

// WordPress is still refusing after every retry. retryAfter is how many
// seconds the caller should wait before asking again.
export class WordPressBusyError extends Error {
  retryAfter: number

  constructor(status: number, retryAfter: number) {
    super(`WordPress is busy (HTTP ${status})`)
    this.name = 'WordPressBusyError'
    this.retryAfter = retryAfter
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryAfterMs(res: Response): number | undefined {
  const seconds = Number(res.headers.get('Retry-After'))
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined
  return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS)
}

// GET a WordPress REST path such as "/wp/v2/posts". Callers make these one at
// a time: requests sent in parallel are what the host refuses.
export async function fetchWordPress(
  path: string,
  params: Record<string, string> = {},
  headers: Record<string, string> = {}
): Promise<Response> {
  if (!wpJson) throw new Error('NEXT_PUBLIC_WORDPRESS_URL is not set')

  let lastStatus = 0
  let lastRetryAfter = 0

  for (let attempt = 0; attempt <= RETRY_WAITS_MS.length; attempt++) {
    // The host caches REST responses for ten minutes by URL. A changing
    // parameter gets the current answer, so a post published a minute ago
    // is in it.
    const query = new URLSearchParams({
      ...params,
      _: String(DateTime.now().toMillis()),
    })
    const res = await fetch(`${wpJson}${path}?${query}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', ...headers },
    })

    if (!RETRY_STATUSES.has(res.status)) return res

    lastStatus = res.status
    const asked = retryAfterMs(res)
    lastRetryAfter = asked ?? 0

    const planned = RETRY_WAITS_MS[attempt]
    if (planned === undefined) break
    await wait(asked ?? planned + Math.random() * 250)
  }

  throw new WordPressBusyError(
    lastStatus,
    Math.max(5, Math.ceil(lastRetryAfter / 1000))
  )
}

// WordPress may or may not have done what it was asked: it answered with an
// error from the host, or did not answer in time.
export class WordPressUnknownOutcomeError extends Error {
  constructor(what: string) {
    super(`No answer from WordPress that says what happened (${what})`)
    this.name = 'WordPressUnknownOutcomeError'
  }
}

const POST_TIMEOUT_MS = 15000
const POST_RETRY_WAITS_MS = [1000, 2500]

// POST JSON to a WordPress REST path and return its answer, whatever the
// status. WordPress sends its notification emails before it answers, so this
// waits longer than a read would.
//
// A request that might have been carried out is never sent twice. The only
// one repeated is a refusal by the host itself, which answers 429 before the
// request reaches WordPress. A 429 from WordPress carries a code, and is
// WordPress's answer.
export async function postWordPress(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
  method: 'POST' | 'PATCH' = 'POST'
): Promise<{ status: number; body: unknown }> {
  if (!wpJson) throw new Error('NEXT_PUBLIC_WORDPRESS_URL is not set')

  let lastRetryAfter = 0

  for (let attempt = 0; attempt <= POST_RETRY_WAITS_MS.length; attempt++) {
    let res: Response
    try {
      res = await fetch(`${wpJson}${path}`, {
        method,
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(POST_TIMEOUT_MS),
      })
    } catch (error) {
      throw new WordPressUnknownOutcomeError((error as Error).name)
    }

    // A page from the host is not JSON, so the answer is read as text first.
    const text = await res.text().catch(() => '')
    let parsed: unknown = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      // Left as null.
    }

    const code =
      parsed && typeof parsed === 'object'
        ? (parsed as { code?: unknown }).code
        : undefined

    if (res.status === 429 && typeof code !== 'string') {
      const asked = retryAfterMs(res)
      lastRetryAfter = asked ?? 0
      const planned = POST_RETRY_WAITS_MS[attempt]
      if (planned === undefined) break
      await wait(asked ?? planned + Math.random() * 250)
      continue
    }

    if (res.status >= 502 && res.status <= 504) {
      throw new WordPressUnknownOutcomeError(`HTTP ${res.status}`)
    }

    return { status: res.status, body: parsed }
  }

  throw new WordPressBusyError(
    429,
    Math.max(5, Math.ceil(lastRetryAfter / 1000))
  )
}
