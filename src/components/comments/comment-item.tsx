'use client'

import clsx from 'clsx'
import { DateTime } from 'luxon'
import type { ReactNode } from 'react'
import { Image } from '@/components/image'
import { Li, List } from '@/components/list'
import { Span } from '@/components/span'
import type { SiteComment } from '@/utils/comment-types'
import { CommentBody } from './comment-body'
import { AWAITING } from './comment-messages'
import { MAX_INDENT, type ThreadNode } from './comment-thread'

interface CommentItemProps {
  node: ThreadNode
  threadDepth: number
  canComment: boolean
  // The comment being answered, if any, and the form to put under it.
  replyingTo: number | null
  form: ReactNode
  onReply: (comment: SiteComment) => void
  // Changes once a minute, so that "5 minutes ago" does not stay that way.
  tick: number
}

function Avatar({ comment }: { comment: SiteComment }) {
  const initial = comment.authorName.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="w-11 h-11 shrink-0 overflow-hidden rounded-full bg-body2 flex items-center justify-center">
      {comment.avatar ? (
        <Image
          src={comment.avatar.src}
          srcSet={`${comment.avatar.src} 1x, ${comment.avatar.src2x} 2x`}
          // The name is written beside it. Saying it twice helps nobody.
          alt=""
          size="small"
          width={44}
          height={44}
          rounded="rounded-none"
          className="w-full h-full object-cover"
        />
      ) : (
        <Span aria-hidden="true" fontSize="text-xs" fontWeight="font-semibold">
          {initial}
        </Span>
      )}
    </div>
  )
}

function When({ dateGmt }: { dateGmt: string }) {
  const date = DateTime.fromISO(dateGmt, { zone: 'utc' })
  if (!date.isValid) return null

  const local = date.toLocal()

  return (
    <time
      dateTime={date.toISO() ?? undefined}
      title={local.toLocaleString(DateTime.DATETIME_MED)}
      className="text-xs text-contrast-light"
    >
      {date.toRelative() ?? local.toLocaleString(DateTime.DATE_MED)}
    </time>
  )
}

export function CommentItem({
  node,
  threadDepth,
  canComment,
  replyingTo,
  form,
  onReply,
  tick,
}: CommentItemProps) {
  const { comment, depth, replies, replyingTo: answers } = node
  const isPending = comment.status === 'pending'

  // WordPress refuses a reply deeper than the site allows, and one to a
  // comment nobody else can see yet.
  const canReply = canComment && !isPending && depth < threadDepth

  return (
    <Li
      id={`comment-${comment.id}`}
      data-comment-id={comment.id}
      className="scroll-mt-24"
    >
      <article
        aria-label={`Comment by ${comment.authorName}`}
        className={clsx('flex gap-4', isPending && 'opacity-80')}
      >
        <Avatar comment={comment} />
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            {comment.authorUrl ? (
              <a
                href={comment.authorUrl}
                target="_blank"
                rel="nofollow ugc noopener noreferrer"
                className="text-xs font-semibold text-contrast underline [overflow-wrap:anywhere]"
              >
                {comment.authorName}
              </a>
            ) : (
              <Span
                fontSize="text-xs"
                fontWeight="font-semibold"
                className="[overflow-wrap:anywhere]"
              >
                {comment.authorName}
              </Span>
            )}
            {comment.isPostAuthor && (
              <Span
                fontSize="text-[10px]"
                fontWeight="font-semibold"
                color="text-accent-contrast"
                className="rounded-full bg-accent px-2 py-0.5 uppercase tracking-wider"
              >
                Author
              </Span>
            )}
            <When dateGmt={comment.dateGmt} key={tick} />
          </div>
          {answers && (
            <Span
              fontSize="text-xs"
              color="text-contrast-light"
              className="mb-2 block"
            >
              Replying to {answers}
            </Span>
          )}
          <CommentBody nodes={comment.body} />
          {isPending && (
            <Span
              fontSize="text-xs"
              fontStyle="italic"
              color="text-contrast-light"
              className="mt-2 block"
            >
              {AWAITING}
            </Span>
          )}
          {canReply && replyingTo !== comment.id && (
            <button
              type="button"
              data-reply-to={comment.id}
              onClick={() => onReply(comment)}
              aria-label={`Reply to ${comment.authorName}`}
              className="mt-4 text-xs font-medium text-accent underline cursor-pointer"
            >
              Reply
            </button>
          )}
          {replyingTo === comment.id && (
            <div className="mt-5 rounded-md border border-accent5 bg-body p-5 shadow-sm">
              {form}
            </div>
          )}
        </div>
      </article>
      {replies.length > 0 && (
        <List
          variant="unstyled"
          margin="mb-0"
          gap="gap-y-10"
          spacing="tight"
          className={clsx(
            // Li gives a nested list 8px; a reply needs the same room as a
            // comment. Forced, as the spacing is, because both are rules on
            // the parent.
            'space-y-0! mt-10!',
            // Replies step in until there is no more room to give.
            depth < MAX_INDENT &&
              'ml-2 border-l border-contrast/10 pl-4 sm:ml-6 sm:pl-6'
          )}
        >
          {replies.map((reply) => (
            <CommentItem
              key={reply.comment.id}
              node={reply}
              threadDepth={threadDepth}
              canComment={canComment}
              replyingTo={replyingTo}
              form={form}
              onReply={onReply}
              tick={tick}
            />
          ))}
        </List>
      )}
    </Li>
  )
}
