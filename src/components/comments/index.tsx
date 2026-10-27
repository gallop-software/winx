'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { DateTime } from 'luxon'
import { useInView } from 'react-intersection-observer'
import { Heading } from '@/components/heading'
import { List } from '@/components/list'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import { useComments } from '@/hooks/use-comments'
import { useMember } from '@/hooks/use-member'
import { state } from '@/state'
import { readCommenter } from '@/utils/comment-storage'
import type { PostCommentResponse, SiteComment } from '@/utils/comment-types'
import { CommentForm, type CommentDraft } from './comment-form'
import { CommentItem } from './comment-item'
import { CLOSED, NOT_LOADED, countLabel } from './comment-messages'
import { buildThread } from './comment-thread'

// How long after the page is opened at its comments the visitor is taken to
// be on their way there still.
const JUMP_FOLLOWED_MS = 5 * 1000

interface CommentsProps {
  // The post's id in WordPress.
  postId: number
  // What the post said about its comments when it was last fetched, which
  // can be a day ago. Only used to decide whether there is anything to load.
  initialCount: number
  initialOpen: boolean
}

type Posted = Extract<PostCommentResponse, { ok: true }>

// The comments on a post, and the form to add one.
//
// Nothing is loaded until the visitor scrolls near. The comments are then
// kept up to date while they are on screen, and a comment the visitor posts
// appears in place: the page is never loaded again.
export function Comments({ postId, initialCount, initialOpen }: CommentsProps) {
  const { ref: nearRef, inView: isNear } = useInView({
    triggerOnce: true,
    rootMargin: '600px 0px',
  })
  const { ref: watchRef, inView: isWatching } = useInView()

  const section = useRef<HTMLElement | null>(null)
  const { openLogin } = useMember()

  // Where the visitor is reading, noted before the list changes and put
  // right after: comments arriving above must not move the page under them.
  const anchor = useRef<{ id: string; top: number } | null>(null)
  const noteAnchor = useCallback(() => {
    const items =
      section.current?.querySelectorAll<HTMLElement>('[data-comment-id]') ?? []
    for (const item of items) {
      const { top, bottom } = item.getBoundingClientRect()
      if (bottom > 0) {
        anchor.current = { id: item.id, top }
        return
      }
    }
    anchor.current = null
  }, [])

  const {
    status,
    settings,
    comments,
    count,
    announcement,
    getToken,
    setToken,
    add,
    retry,
  } = useComments(postId, {
    enabled: isNear,
    watching: isWatching,
    onBeforeChange: noteAnchor,
  })

  const [replyTo, setReplyTo] = useState<SiteComment | null>(null)
  const [notice, setNotice] = useState('')
  const [justPosted, setJustPosted] = useState<number | null>(null)
  const [tick, setTick] = useState(0)

  const draft = useRef<CommentDraft>({ name: '', email: '', content: '' })
  const remembered = useRef(false)
  if (!remembered.current && typeof window !== 'undefined') {
    remembered.current = true
    draft.current = { ...draft.current, ...readCommenter() }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setTick((n) => n + 1), 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  useLayoutEffect(() => {
    const noted = anchor.current
    anchor.current = null
    if (!noted) return

    const item = document.getElementById(noted.id)
    if (!item) return

    const moved = item.getBoundingClientRect().top - noted.top
    if (Math.abs(moved) > 1) window.scrollBy(0, moved)
  }, [comments])

  // A comment just posted is brought into view, if it is not there already.
  useEffect(() => {
    if (justPosted === null) return
    const item = document.getElementById(`comment-${justPosted}`)
    if (!item) return

    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    item.scrollIntoView({
      block: 'nearest',
      behavior: calm ? 'auto' : 'smooth',
    })
    setJustPosted(null)
  }, [justPosted, comments])

  // A visitor who came by the comment count in the toolbar, or opened the
  // page at its comments, set off while there was only a heading near the
  // foot of the page. Once there are comments under it, the heading is put
  // where the link meant it to be.
  const openedAt = useRef(DateTime.now().toMillis())
  const onTheWay = useRef(false)
  useEffect(() => {
    if (status !== 'loading') return
    if (window.location.hash !== '#comments') return

    // SmoothScroll holds the direction while it is taking the visitor there.
    onTheWay.current =
      state.lockScrollDirection ||
      DateTime.now().toMillis() - openedAt.current < JUMP_FOLLOWED_MS
  }, [status])

  useEffect(() => {
    if (status !== 'ready' || !onTheWay.current) return
    onTheWay.current = false

    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('comments')?.scrollIntoView({
      block: 'start',
      behavior: calm ? 'auto' : 'smooth',
    })
  }, [status])

  const threads = useMemo(() => buildThread(comments), [comments])

  const startReply = useCallback((comment: SiteComment) => {
    setNotice('')
    setReplyTo(comment)
  }, [])

  const cancelReply = useCallback(() => {
    const id = replyTo?.id
    setReplyTo(null)
    // Back to where the visitor was before they chose to answer.
    window.requestAnimationFrame(() => {
      section.current
        ?.querySelector<HTMLElement>(`[data-reply-to="${id}"]`)
        ?.focus()
    })
  }, [replyTo])

  const handlePosted = useCallback(
    (posted: Posted) => {
      add(posted)
      setReplyTo(null)
      setJustPosted(posted.comment.id)
    },
    [add]
  )

  // Nothing to show and nothing to add.
  if (!initialOpen && initialCount === 0) return null
  if (status === 'unavailable') return null
  if (status === 'error' && initialCount === 0) return null

  const setRefs = (node: HTMLElement | null) => {
    section.current = node
    nearRef(node)
    watchRef(node)
  }

  const form = settings?.canComment ? (
    <CommentForm
      // Put up afresh when it moves, with what was typed put back in.
      key={replyTo?.id ?? 'new'}
      postId={postId}
      replyTo={replyTo}
      draft={draft}
      getToken={getToken}
      setToken={setToken}
      onPosted={handlePosted}
      onCancelReply={cancelReply}
      status={notice}
      setStatus={setNotice}
    />
  ) : null

  return (
    <section
      ref={setRefs}
      aria-labelledby="comments"
      className="mt-10 border-t border-contrast/10 pt-7"
    >
      <Heading as="h2" id="comments" margin="mb-8">
        {status === 'ready' ? countLabel(count) : 'Comments'}
      </Heading>

      {(status === 'idle' || status === 'loading') && (
        <Paragraph margin="mb-0">
          Loading
          <Span
            aria-hidden="true"
            className="after:content-['...'] after:animate-dots"
          />
        </Paragraph>
      )}

      {status === 'error' && (
        <Paragraph margin="mb-0">
          {NOT_LOADED}{' '}
          <button
            type="button"
            onClick={retry}
            className="font-medium text-accent underline cursor-pointer"
          >
            Try again
          </button>
        </Paragraph>
      )}

      {status === 'ready' && settings && (
        <>
          {threads.length > 0 && (
            <List
              variant="unstyled"
              margin="mb-0"
              gap="gap-y-10"
              spacing="tight"
              className="space-y-0!"
            >
              {threads.map((node) => (
                <CommentItem
                  key={node.comment.id}
                  node={node}
                  threadDepth={settings.threadDepth}
                  canComment={settings.canComment}
                  replyingTo={replyTo?.id ?? null}
                  form={form}
                  onReply={startReply}
                  tick={tick}
                />
              ))}
            </List>
          )}

          {settings.canComment && !replyTo && (
            <div className="mt-10 max-w-3xl">
              <Heading as="h3" margin="mb-5" disableId>
                Leave a comment
              </Heading>
              {form}
            </div>
          )}

          {settings.membersOnly && (
            <Paragraph margin="mt-8 mb-0">
              <button
                type="button"
                onClick={openLogin}
                className="font-medium text-accent underline cursor-pointer"
              >
                Log in
              </button>{' '}
              to leave a comment.
            </Paragraph>
          )}
          {!settings.open && !settings.membersOnly && !settings.canComment && (
            <Paragraph margin="mt-8 mb-0">{CLOSED}</Paragraph>
          )}
        </>
      )}

      <Span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </Span>
    </section>
  )
}
