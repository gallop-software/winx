// What the site sends the browser about comments. Shared by the server, which
// builds it, and the components, which show it.

export type CommentTag =
  | 'p'
  | 'br'
  | 'a'
  | 'em'
  | 'i'
  | 'strong'
  | 'b'
  | 'blockquote'
  | 'code'
  | 'pre'
  | 'ul'
  | 'ol'
  | 'li'
  | 'del'
  | 's'
  | 'cite'
  | 'q'
  | 'abbr'

// A comment's text as a tree of the elements a comment may contain. The
// browser is sent this, never the HTML it was made from.
export type CommentNode =
  | string
  | { tag: Exclude<CommentTag, 'a'>; children: CommentNode[] }
  | { tag: 'a'; href: string; children: CommentNode[] }

export type SiteComment = {
  id: number
  parent: number
  authorName: string
  authorUrl: string
  isPostAuthor: boolean
  avatar: { src: string; src2x: string } | null
  dateGmt: string
  body: CommentNode[]
  // pending: saved, and waiting for the site to approve it. Only ever sent to
  // the visitor who wrote the comment.
  status: 'approved' | 'pending'
}

export type CommentsResponse =
  // Nothing to show: no such post, or WordPress has no comments to offer.
  | { available: false }
  // Nothing has changed since the version the browser already has.
  | { available: true; unchanged: true; token: string | null }
  | {
      available: true
      unchanged?: false
      post: number
      open: boolean
      count: number
      // Whether to show the form: comments are open to this visitor and the
      // site is set up to send them.
      canComment: boolean
      // Only members may comment here, and the visitor is not logged in.
      membersOnly: boolean
      threadDepth: number
      requireNameEmail: boolean
      comments: SiteComment[]
      version: string
      // The list is being brought up to date: ask again shortly.
      stale: boolean
      token: string | null
    }

export type CommentErrorCode =
  | 'rejected'
  | 'too_large'
  | 'missing_fields'
  | 'missing_comment'
  | 'invalid_email'
  | 'too_long'
  | 'name_too_long'
  | 'too_fast'
  | 'daily_limit'
  | 'site_busy'
  | 'closed'
  | 'login_required'
  | 'duplicate'
  | 'invalid_parent'
  | 'wordpress_busy'
  | 'unavailable'
  | 'failed'

export type PostCommentResponse =
  | {
      ok: true
      status: 'approved' | 'pending'
      comment: SiteComment
      count: number
      token: string | null
    }
  | {
      ok: false
      code: CommentErrorCode
      retryAfter?: number
      token?: string | null
    }

export const COMMENT_MAX_LENGTH = 5000
export const COMMENT_NAME_MAX_LENGTH = 245
export const COMMENT_EMAIL_MAX_LENGTH = 100
