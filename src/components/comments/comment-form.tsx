'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { DateTime } from 'luxon'
import { FormButton, FormInput, FormTextArea } from '@/components/form'
import { Paragraph } from '@/components/paragraph'
import { useMember } from '@/hooks/use-member'
import { writeCommenter } from '@/utils/comment-storage'
import {
  COMMENT_MAX_LENGTH,
  type PostCommentResponse,
  type SiteComment,
} from '@/utils/comment-types'
import { HELD, NETWORK, POSTED, REFUSED } from './comment-messages'

export type CommentDraft = { name: string; email: string; content: string }

type Posted = Extract<PostCommentResponse, { ok: true }>

interface CommentFormProps {
  postId: number
  // The comment being answered, or null for a comment on the post.
  replyTo: SiteComment | null
  // What has been typed. Kept by the parent, because the form is taken down
  // and put up again when it moves under a comment to answer it.
  draft: RefObject<CommentDraft>
  getToken: () => { value: string; at: number } | null
  setToken: (token: string | null | undefined) => void
  onPosted: (posted: Posted) => void
  onCancelReply: () => void
  status: string
  setStatus: (status: string) => void
}

// The server does not accept a token it issued less than three seconds ago:
// nobody writes a comment that fast. A little is added for the clocks.
const TOKEN_MIN_AGE_MS = 3200

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// The comment form. It looks and behaves like the contact form, and is built
// from the same fields and button. It does not use the contact form's <Form>,
// which sends what was typed and reports success, but does not read what
// comes back: a comment has to be shown once it is posted.
export function CommentForm({
  postId,
  replyTo,
  draft,
  getToken,
  setToken,
  onPosted,
  onCancelReply,
  status,
  setStatus,
}: CommentFormProps) {
  const { member } = useMember()
  const [isSending, setIsSending] = useState(false)
  // State is a render behind. This is what stops a second click that comes
  // before the button has been redrawn.
  const sending = useRef(false)
  const form = useRef<HTMLFormElement>(null)

  const field = (name: string) =>
    form.current?.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null

  // Answering a comment starts with the cursor where the answer goes.
  useEffect(() => {
    if (replyTo) field('comment')?.focus({ preventScroll: false })
    // Only when the form is put up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const remember = () => {
    draft.current = {
      name: field('author')?.value ?? '',
      email: field('email')?.value ?? '',
      content: field('comment')?.value ?? '',
    }
  }

  async function send(
    body: Record<string, unknown>,
    retried: boolean
  ): Promise<void> {
    const token = getToken()
    if (!token) {
      setStatus(REFUSED.unavailable)
      return
    }

    const age = DateTime.now().toMillis() - token.at
    if (age < TOKEN_MIN_AGE_MS) await wait(TOKEN_MIN_AGE_MS - age)

    const response = await fetch('/api/comments/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, token: token.value }),
    })

    const answer = (await response
      .json()
      .catch(() => null)) as PostCommentResponse | null

    if (!answer) {
      setStatus(REFUSED.failed)
      return
    }

    if (answer.ok) {
      if (!member) {
        writeCommenter({
          name: String(body.name),
          email: String(body.email),
        })
      }

      const comment = field('comment')
      if (comment) comment.value = ''
      remember()

      setStatus(answer.status === 'approved' ? POSTED : HELD)
      onPosted(answer)
      return
    }

    if (answer.token) setToken(answer.token)

    // A form left open for hours has a token that has run out. The answer
    // brings a new one: try once more with that before troubling the visitor.
    if (answer.code === 'rejected' && answer.token && !retried) {
      return send(body, true)
    }

    setStatus(REFUSED[answer.code] ?? REFUSED.failed)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current) return
    sending.current = true
    // Before anything that takes time, so the button responds to the click.
    setIsSending(true)
    setStatus('')

    try {
      // The field no person sees. Nothing is sent if it has been filled in.
      if (field('website')?.value) {
        setStatus(REFUSED.rejected)
        return
      }

      const name = member ? '' : (field('author')?.value ?? '').trim()
      const email = member ? '' : (field('email')?.value ?? '').trim()
      const content = (field('comment')?.value ?? '').trim()

      if (!member && (!name || !email)) {
        setStatus(REFUSED.missing_fields)
        return
      }
      if (!content) {
        setStatus(REFUSED.missing_comment)
        return
      }
      if (content.length > COMMENT_MAX_LENGTH) {
        setStatus(REFUSED.too_long)
        return
      }

      await send(
        {
          post: postId,
          parent: replyTo?.id ?? 0,
          name,
          email,
          content,
          website: '',
        },
        false
      )
    } catch {
      setStatus(NETWORK)
    } finally {
      sending.current = false
      setIsSending(false)
    }
  }

  return (
    <>
      {replyTo && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <Paragraph margin="mb-0" color="text-contrast">
            Replying to {replyTo.authorName}
          </Paragraph>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-xs font-medium text-accent underline cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
      <form
        ref={form}
        onSubmit={handleSubmit}
        onInput={remember}
        className="flex flex-col gap-3"
      >
        <input
          type="text"
          name="website"
          className="!hidden"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
        />
        {member ? (
          <Paragraph fontSize="text-xs" margin="mb-0" color="text-contrast-light">
            Commenting as {member.name}
          </Paragraph>
        ) : (
        <div className="flex flex-col md:flex-row gap-3">
          <label htmlFor="comment-author" className="sr-only">
            Name
          </label>
          <FormInput
            id="comment-author"
            name="author"
            placeholder="Name*"
            label="Name"
            autoComplete="name"
            defaultValue={draft.current.name}
            required
          />
          <label htmlFor="comment-email" className="sr-only">
            Email, which will not be published
          </label>
          <FormInput
            id="comment-email"
            name="email"
            type="email"
            placeholder="Email* (will not be published)"
            label="Email"
            autoComplete="email"
            defaultValue={draft.current.email}
            required
          />
        </div>
        )}
        <label htmlFor="comment-content" className="sr-only">
          Comment
        </label>
        <FormTextArea
          id="comment-content"
          name="comment"
          placeholder={replyTo ? 'Reply*' : 'Comment*'}
          label="Comment"
          rows={5}
          defaultValue={draft.current.content}
          required
        />
        <FormButton
          name="submit"
          label={replyTo ? 'Post Reply' : 'Post Comment'}
          isLoading={isSending}
          disabled={isSending}
          className="!text-xs !px-4 !py-2 disabled:!opacity-70"
        />
      </form>
      <Paragraph
        role="status"
        aria-live="polite"
        textAlign="text-center"
        fontWeight="font-medium"
        margin="mt-4 mb-0"
        className="empty:hidden"
      >
        {status}
      </Paragraph>
    </>
  )
}
