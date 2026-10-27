import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { DateTime } from 'luxon'
import { sanitizeCommentHtml, safeHref } from '@/utils/comment-html'
import {
  COMMENT_NAME_MAX_LENGTH,
  type CommentErrorCode,
  type SiteComment,
} from '@/utils/comment-types'
import { postExists, recordCommentCount } from '@/utils/content-index'
import { decodeEntities } from '@/utils/html-text'
import { MAX_AGE_MS, getClearedAt } from '@/utils/post-cache'
import {
  fetchWordPress,
  postWordPress,
  WordPressBusyError,
  WordPressUnknownOutcomeError,
} from '@/utils/wp-fetch'

// A post's comments, read from and sent to the Gallop plugin's comments
// routes on WordPress. They are kept apart from the post itself, which is
// cached for a day: a conversation changes by the minute.

export type CommentsData = {
  post: number
  open: boolean
  // Open to a member logged in on the site, which "registered users only"
  // does not close. Absent from an older plugin: taken to be the same as open.
  openToMembers: boolean
  count: number
  requireNameEmail: boolean
  threadDepth: number
  comments: SiteComment[]
}

// data is null when WordPress has nothing to offer for the post: the post is
// not one whose comments can be read, or the plugin there has no comments
// routes.
type CacheEntry = {
  data: CommentsData | null
  fetchedAt: number
  version: string
}

export type CommentsResult = {
  data: CommentsData | null
  version: string
  // A newer copy is being fetched. What is returned may be behind.
  stale: boolean
}

type CommentCache = {
  get(key: string, type: 'json'): Promise<unknown>
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>
  delete(key: string): Promise<void>
}

const ROUTE = '/gallop/v1/comments'
const KEY_HEADER = 'X-Gallop-WP-Key'

// How long a copy is served before WordPress is asked again: as long as the
// post itself. A comment posted through the site refreshes the copy at once.
// One approved, edited or removed in WordPress shows on Revalidate, or when
// the copy is a day old. Readers never decide when WordPress is asked, so
// its load does not grow with theirs.
const FRESH_MS = MAX_AGE_MS
const FRESH_MISSING_MS = 10 * 60 * 1000

// Entries nobody asks for again are dropped by the store itself.
const KEEP_SECONDS = 30 * 24 * 60 * 60

// A refresh started this recently is not started again. Times only: a
// promise must not be shared between requests on Workers.
const REFRESH_GUARD_MS = 20 * 1000
const refreshing = new Map<number, number>()

function getCache(): CommentCache | undefined {
  try {
    const env = getCloudflareContext().env as unknown as {
      POST_CACHE?: CommentCache
    }
    return env.POST_CACHE
  } catch {
    return undefined
  }
}

const cacheKey = (postId: number) => `comments:${postId}`

function apiKey(): string {
  return (process.env.GALLOP_WP_API_KEY ?? '').trim()
}

// Whether the site can send comments to WordPress. Without the key comments
// are still shown, and the form is not.
export function isCommentingConfigured(): boolean {
  return apiKey() !== ''
}

export function getCommentSecret(): string {
  return apiKey()
}

// --- What WordPress sends ---

type WpComment = {
  id?: unknown
  parent?: unknown
  authorName?: unknown
  authorUrl?: unknown
  isPostAuthor?: unknown
  avatar?: unknown
  dateGmt?: unknown
  content?: unknown
  status?: unknown
}

function avatarOf(value: unknown): SiteComment['avatar'] {
  if (!value || typeof value !== 'object') return null
  const sizes = value as Record<string, unknown>

  const https = (raw: unknown) => {
    const href = safeHref(raw)
    return href?.startsWith('https://') ? href : undefined
  }

  const src = https(sizes['48']) ?? https(sizes['96'])
  if (!src) return null
  return { src, src2x: https(sizes['96']) ?? src }
}

function toSiteComment(
  raw: WpComment,
  status: SiteComment['status']
): SiteComment | null {
  if (typeof raw.id !== 'number' || !Number.isInteger(raw.id)) return null

  const date = typeof raw.dateGmt === 'string' ? raw.dateGmt : ''

  return {
    id: raw.id,
    parent:
      typeof raw.parent === 'number' && raw.parent > 0 ? raw.parent : 0,
    authorName:
      decodeEntities(String(raw.authorName ?? ''))
        .trim()
        .slice(0, COMMENT_NAME_MAX_LENGTH) || 'Anonymous',
    authorUrl: safeHref(raw.authorUrl) ?? '',
    isPostAuthor: raw.isPostAuthor === true,
    avatar: avatarOf(raw.avatar),
    dateGmt: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(date)
      ? date.slice(0, 19)
      : '',
    body: sanitizeCommentHtml(raw.content),
    status,
  }
}

async function versionOf(data: CommentsData | null): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  let binary = ''
  for (const byte of digest) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').slice(0, 16)
}

async function fetchComments(postId: number): Promise<CommentsData | null> {
  const res = await fetchWordPress(ROUTE, { post: String(postId) })

  // No such post, or a plugin without these routes.
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`WordPress returned ${res.status} for comments`)

  const body = (await res.json()) as {
    open?: unknown
    openToMembers?: unknown
    count?: unknown
    requireNameEmail?: unknown
    threadDepth?: unknown
    comments?: unknown
  }

  const comments: SiteComment[] = []
  for (const raw of Array.isArray(body.comments) ? body.comments : []) {
    const comment = toSiteComment(raw as WpComment, 'approved')
    if (comment) comments.push(comment)
  }

  const depth = Number(body.threadDepth)

  return {
    post: postId,
    open: body.open === true,
    openToMembers:
      body.openToMembers === undefined ? body.open === true : body.openToMembers === true,
    count: Number(body.count) || comments.length,
    requireNameEmail: body.requireNameEmail !== false,
    threadDepth: Number.isInteger(depth) && depth > 0 ? Math.min(depth, 10) : 1,
    comments,
  }
}

// --- Reading ---

// Fetches the post's comments from WordPress and replaces the copy kept.
export async function refreshComments(
  postId: number
): Promise<CommentsResult> {
  refreshing.set(postId, DateTime.now().toMillis())

  const data = await fetchComments(postId)
  const entry: CacheEntry = {
    data,
    fetchedAt: DateTime.now().toMillis(),
    version: await versionOf(data),
  }

  const kv = getCache()
  if (kv) {
    await kv.put(cacheKey(postId), JSON.stringify(entry), {
      expirationTtl: KEEP_SECONDS,
    })
  }

  // Lists show the count from the index, so it learns what was just read.
  if (data) {
    await recordCommentCount(postId, data.count, data.open).catch((error) => {
      console.error('Comment count not recorded:', error)
    })
  }

  return { data, version: entry.version, stale: false }
}

function freshFor(entry: CacheEntry): number {
  return entry.data ? FRESH_MS : FRESH_MISSING_MS
}

function refreshBehind(postId: number) {
  const now = DateTime.now().toMillis()
  const started = refreshing.get(postId) ?? 0
  if (now - started < REFRESH_GUARD_MS) return

  refreshing.set(postId, now)
  try {
    getCloudflareContext().ctx.waitUntil(
      refreshComments(postId).catch((error) => {
        console.error('Comments refresh failed:', error)
      })
    )
  } catch {
    // No request to run it behind: the next visit will try again.
    refreshing.delete(postId)
  }
}

// The post's comments, from the copy kept if there is one. An old copy is
// returned at once and brought up to date behind the visitor.
export async function getComments(postId: number): Promise<CommentsResult> {
  const kv = getCache()

  let entry: CacheEntry | null = null
  let clearedAt = 0
  if (kv) {
    try {
      const [cached, cleared] = await Promise.all([
        kv.get(cacheKey(postId), 'json'),
        getClearedAt(),
      ])
      entry = cached as CacheEntry | null
      clearedAt = cleared
    } catch (error) {
      console.error('Comments cache read failed:', error)
    }
  }

  const usable =
    entry &&
    typeof entry.fetchedAt === 'number' &&
    typeof entry.version === 'string' &&
    entry.fetchedAt > clearedAt

  if (!entry || !usable) {
    // WordPress is only asked about posts the site knows. Otherwise anyone
    // could have it asked about every number there is.
    if (!(await postExists(postId))) {
      return { data: null, version: '', stale: false }
    }
    return refreshComments(postId)
  }

  const age = DateTime.now().toMillis() - entry.fetchedAt
  if (age <= freshFor(entry)) {
    return { data: entry.data, version: entry.version, stale: false }
  }

  refreshBehind(postId)
  return { data: entry.data, version: entry.version, stale: true }
}

export async function clearComments(postId: number): Promise<void> {
  const kv = getCache()
  if (kv) await kv.delete(cacheKey(postId))
}

// --- Sending ---

export type NewComment = {
  post: number
  parent: number
  authorName: string
  authorEmail: string
  content: string
  // The visitor's, for WordPress to record and check the comment against.
  ip: string
  userAgent: string
  referer: string
  // A member logged in on the site: WordPress records the comment as theirs
  // and takes the name and address from the account.
  member?: { id: number; version: number }
}

export type CreateResult =
  | {
      ok: true
      comment: SiteComment
      // What WordPress made of it. The visitor is only told approved or not.
      wpStatus: string
      count: number
    }
  | { ok: false; code: CommentErrorCode; retryAfter?: number }

// WordPress's reasons, as the site tells them to a visitor.
const REFUSALS: Record<string, CommentErrorCode> = {
  gallop_comment_closed: 'closed',
  gallop_comment_login_required: 'login_required',
  gallop_member_session_invalid: 'login_required',
  gallop_comments_post_not_found: 'closed',
  gallop_comment_name_email_required: 'missing_fields',
  gallop_comment_invalid_email: 'invalid_email',
  gallop_comment_email_too_long: 'invalid_email',
  gallop_comment_empty: 'missing_comment',
  gallop_comment_too_long: 'too_long',
  gallop_comment_name_too_long: 'name_too_long',
  gallop_comment_invalid_parent: 'invalid_parent',
  gallop_comment_thread_too_deep: 'invalid_parent',
  gallop_comment_threading_disabled: 'invalid_parent',
  gallop_comment_duplicate: 'duplicate',
  gallop_comment_flood: 'too_fast',
}

// Refusals that are about how the site is set up, not about the comment. The
// visitor can do nothing about them, so they are logged for the owner.
const SETUP_PROBLEMS = new Set([
  'gallop_key_missing',
  'gallop_key_invalid',
  'gallop_key_forbidden',
  'gallop_key_rate_limited',
  'gallop_https_required',
  'rest_no_route',
])

export async function createComment(input: NewComment): Promise<CreateResult> {
  const key = apiKey()
  if (!key) return { ok: false, code: 'unavailable' }

  let answer: { status: number; body: unknown }
  try {
    answer = await postWordPress(
      ROUTE,
      {
        post: input.post,
        parent: input.parent,
        authorName: input.authorName,
        authorEmail: input.authorEmail,
        authorUrl: '',
        content: input.content,
        ip: input.ip,
        userAgent: input.userAgent,
        referer: input.referer,
        ...(input.member
          ? { user: input.member.id, sessionVersion: input.member.version }
          : {}),
      },
      { [KEY_HEADER]: key }
    )
  } catch (error) {
    if (error instanceof WordPressBusyError) {
      return {
        ok: false,
        code: 'wordpress_busy',
        retryAfter: error.retryAfter,
      }
    }
    if (error instanceof WordPressUnknownOutcomeError) {
      console.error('Comment not confirmed by WordPress:', error.message)
      return { ok: false, code: 'wordpress_busy' }
    }
    throw error
  }

  const body = (answer.body ?? {}) as {
    code?: unknown
    comment?: WpComment
    count?: unknown
  }

  if (answer.status === 201 && body.comment) {
    const wpStatus = String(body.comment.status ?? 'hold')
    const comment = toSiteComment(
      body.comment,
      wpStatus === 'approved' ? 'approved' : 'pending'
    )
    if (comment) {
      return { ok: true, comment, wpStatus, count: Number(body.count) || 0 }
    }
  }

  const code = typeof body.code === 'string' ? body.code : ''

  if (SETUP_PROBLEMS.has(code)) {
    // The status and code only. The key is never logged.
    console.error(`WordPress refused the site's key: ${answer.status} ${code}`)
    return { ok: false, code: 'unavailable' }
  }

  const refusal = REFUSALS[code]
  if (refusal) return { ok: false, code: refusal }

  console.error(`WordPress refused a comment: ${answer.status} ${code}`)
  return { ok: false, code: 'failed' }
}
