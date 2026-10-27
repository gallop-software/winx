import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  claimAttempt,
  hashIp,
  isSameOrigin,
  issueToken,
  verifyToken,
  visitorIp,
} from '@/utils/comment-guard'
import {
  COMMENT_EMAIL_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
  COMMENT_NAME_MAX_LENGTH,
  type CommentErrorCode,
  type CommentsResponse,
  type PostCommentResponse,
} from '@/utils/comment-types'
import {
  createComment,
  getCommentSecret,
  getComments,
  isCommentingConfigured,
  refreshComments,
} from '@/utils/comments'
import { readSession } from '@/utils/member-session'
import { getPostUrlById } from '@/utils/content-index'
import { clearPagesAt, clearPagesNow } from '@/utils/post-cache'
import { readBody } from '@/utils/read-body'
import { isEmail } from '@/utils/send-email'
import { WordPressBusyError } from '@/utils/wp-fetch'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

// A comment is 5,000 characters at most, and a character can be four bytes.
const MAX_BODY_BYTES = 32 * 1024

const USER_AGENT_MAX = 254

function postIdOf(value: unknown): number | null {
  const text = typeof value === 'number' ? String(value) : value
  if (typeof text !== 'string' || !/^[1-9]\d{0,9}$/.test(text)) return null
  return Number(text)
}

async function tokenFor(postId: number, canComment: boolean) {
  return canComment ? issueToken(getCommentSecret(), postId) : null
}

// The comments on a post, for the comments section to show.
//
//   ?post=<id>   the post
//   &v=<version> the version the browser has; if it is still current, the
//                comments are not sent again
//
// Always answered from the copy kept. See getComments() for when WordPress
// is asked.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const postId = postIdOf(searchParams.get('post'))
  if (postId === null) {
    return NextResponse.json(
      { error: 'A post is required.' },
      { status: 400, headers: NO_STORE }
    )
  }

  let result
  try {
    result = await getComments(postId)
  } catch (error) {
    const busy = error instanceof WordPressBusyError
    if (!busy) console.error('Comments could not be read:', error)
    return NextResponse.json(
      { error: 'busy', retryAfter: busy ? error.retryAfter : 30 },
      { status: 503, headers: NO_STORE }
    )
  }

  const { data, version, stale } = result

  let body: CommentsResponse
  if (!data) {
    body = { available: false }
  } else {
    const member = await readSession(req)
    const openToVisitor = data.open || (data.openToMembers && member !== null)
    const canComment = openToVisitor && isCommentingConfigured()
    const token = await tokenFor(postId, canComment)

    body =
      version !== '' && searchParams.get('v') === version
        ? { available: true, unchanged: true, token }
        : {
            available: true,
            post: data.post,
            open: data.open,
            count: data.count,
            canComment,
            membersOnly: !data.open && data.openToMembers && member === null,
            threadDepth: data.threadDepth,
            requireNameEmail: data.requireNameEmail,
            comments: data.comments,
            version,
            stale,
            token,
          }
  }

  return NextResponse.json(body, { headers: NO_STORE })
}

function refuse(
  code: CommentErrorCode,
  status: number,
  extra: { retryAfter?: number; token?: string | null } = {}
) {
  const body: PostCommentResponse = { ok: false, code, ...extra }
  return NextResponse.json(body, {
    status,
    headers: {
      ...NO_STORE,
      ...(extra.retryAfter ? { 'Retry-After': String(extra.retryAfter) } : {}),
    },
  })
}

const REFUSAL_STATUS: Partial<Record<CommentErrorCode, number>> = {
  closed: 403,
  login_required: 401,
  duplicate: 409,
  too_fast: 429,
  wordpress_busy: 503,
  unavailable: 503,
  failed: 502,
}

function refreshBehind(postId: number) {
  try {
    getCloudflareContext().ctx.waitUntil(
      refreshComments(postId).catch((error) => {
        console.error('Comments refresh failed:', error)
      })
    )
  } catch {
    // No request to run it behind. Revalidate brings the copy up to date.
  }
}

// A visitor's comment, on its way to WordPress.
//
// The checks that cost nothing come first, and what can tell a visitor
// something useful comes before what counts against them: a mistyped email
// address is not one of their five comments.
//
// Everything that means "this did not come from the form" is refused the
// same way, so the answer does not say which check it was.
export async function POST(req: NextRequest) {
  if (!isCommentingConfigured()) return refuse('unavailable', 503)

  if (!isSameOrigin(req)) return refuse('rejected', 403)

  const type = req.headers.get('content-type') ?? ''
  if (!type.toLowerCase().startsWith('application/json')) {
    return refuse('rejected', 415)
  }

  const text = await readBody(req, MAX_BODY_BYTES).catch(() => null)
  if (text === 'too_large') return refuse('too_large', 413)

  let input: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(text ?? '')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return refuse('rejected', 400)
    }
    input = parsed as Record<string, unknown>
  } catch {
    return refuse('rejected', 400)
  }

  // The field no person sees. The contact form has the same one.
  if (input.website !== undefined && input.website !== '') {
    return refuse('rejected', 400)
  }

  const postId = postIdOf(input.post)
  const parent =
    input.parent === undefined || input.parent === 0
      ? 0
      : postIdOf(input.parent)
  if (postId === null || parent === null) return refuse('rejected', 400)

  const secret = getCommentSecret()

  const checked = await verifyToken(secret, input.token, postId)
  if (!checked.ok) {
    // With a token to try again with: a form left open for hours has a
    // token that has run out, through no fault of the visitor.
    return refuse('rejected', 400, { token: await issueToken(secret, postId) })
  }

  // From here on the token is spent or about to be, so every answer carries
  // the next one.
  const next = () => issueToken(secret, postId)

  // A member's name and address come from their account.
  const member = await readSession(req)
  const name = member ? '' : typeof input.name === 'string' ? input.name.trim() : ''
  const email = member ? '' : typeof input.email === 'string' ? input.email.trim() : ''
  const content = typeof input.content === 'string' ? input.content.trim() : ''

  if (!member && (!name || !email)) {
    return refuse('missing_fields', 422, { token: await next() })
  }
  if (name.length > COMMENT_NAME_MAX_LENGTH) {
    return refuse('name_too_long', 422, { token: await next() })
  }
  if (email && (email.length > COMMENT_EMAIL_MAX_LENGTH || !isEmail(email))) {
    return refuse('invalid_email', 422, { token: await next() })
  }
  if (!content) {
    return refuse('missing_comment', 422, { token: await next() })
  }
  if (content.length > COMMENT_MAX_LENGTH) {
    return refuse('too_long', 422, { token: await next() })
  }

  const ip = visitorIp(req)
  if (!ip) return refuse('rejected', 400)

  let claim
  try {
    claim = await claimAttempt({
      ipHash: await hashIp(secret, ip),
      postId,
      tokenId: checked.tokenId,
    })
  } catch (error) {
    // Without the limits nothing is sent on.
    console.error('Comment limits could not be checked:', error)
    return refuse('unavailable', 503, { token: await next() })
  }

  if (!claim.ok) {
    if (claim.reason === 'token_used') {
      return refuse('rejected', 400, { token: await next() })
    }
    return refuse(claim.reason, 429, {
      retryAfter: claim.retryAfter,
      token: await next(),
    })
  }

  const referer = req.headers.get('referer') ?? ''

  const result = await createComment({
    post: postId,
    parent,
    authorName: name,
    authorEmail: email,
    content,
    ip,
    userAgent: (req.headers.get('user-agent') ?? '').slice(0, USER_AGENT_MAX),
    referer,
    ...(member ? { member: { id: member.id, version: member.version } } : {}),
  })

  if (!result.ok) {
    // Already there: a comment sent before, whose answer never arrived.
    // Reading the comments again is what makes it appear.
    if (result.code === 'duplicate') refreshBehind(postId)

    return refuse(result.code, REFUSAL_STATUS[result.code] ?? 422, {
      ...(result.retryAfter ? { retryAfter: result.retryAfter } : {}),
      token: await next(),
    })
  }

  const approved = result.comment.status === 'approved'
  if (approved) {
    refreshBehind(postId)
    // The post's page, with its count and its comments, and the lists that
    // show the count, are rebuilt on their next visit.
    const url = await getPostUrlById(postId)
    if (url) await clearPagesAt([url])
    else await clearPagesNow()
  }

  // A comment WordPress marked as spam is answered like one held for
  // approval. Someone sending spam learns nothing from it.
  const body: PostCommentResponse = {
    ok: true,
    status: result.comment.status,
    comment: result.comment,
    count: result.count,
    token: await next(),
  }
  return NextResponse.json(body, { status: 201, headers: NO_STORE })
}
