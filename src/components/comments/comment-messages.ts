import type { CommentErrorCode } from '@/utils/comment-types'

// What a visitor is told, in one place.

export const POSTED = 'Comment posted. Thank you.'
export const HELD = 'Comment received. It will appear once it is approved.'
export const AWAITING = 'Awaiting moderation.'
export const NETWORK =
  'Could not reach the site. Check your connection and try again.'
export const NOT_LOADED = 'Comments could not be loaded.'
export const CLOSED = 'Comments are closed.'

export const REFUSED: Record<CommentErrorCode, string> = {
  rejected: 'Comment did not post. Please reload the page and try again.',
  too_large: 'Your comment is too long. Please keep it under 5,000 characters.',
  missing_fields: 'Please fill in your name, email and comment.',
  missing_comment: 'Please write a comment.',
  invalid_email: 'Please enter a valid email address.',
  too_long: 'Your comment is too long. Please keep it under 5,000 characters.',
  name_too_long: 'Your name is too long.',
  too_fast: 'You are posting too quickly. Please wait a moment and try again.',
  daily_limit:
    'You have reached the limit for today. Please try again tomorrow.',
  site_busy: 'Comments are busy right now. Please try again in a few minutes.',
  closed: CLOSED,
  login_required: 'Please log in to comment.',
  duplicate: 'You have already posted this comment.',
  invalid_parent: 'The comment you are replying to is no longer available.',
  wordpress_busy: 'The site is busy right now. Please try again in a moment.',
  unavailable: 'Comments are unavailable right now.',
  failed: 'Comment did not post.',
}

export function countLabel(count: number): string {
  if (count === 0) return 'No comments yet'
  return count === 1 ? '1 Comment' : `${count.toLocaleString()} Comments`
}
