# Use Comments

A React hook that loads a post's comments, keeps them up to date while the visitor is reading them, and holds the token the comment form sends back.

**Tier:** Free
**File:** `src/hooks/use-comments.tsx`

## Usage

```tsx
'use client'

import { useInView } from 'react-intersection-observer'
import { useComments } from '@/hooks/use-comments'

export function Comments({ postId }: { postId: number }) {
  const { ref, inView } = useInView()
  const { status, comments, count } = useComments(postId, {
    enabled: inView,
    watching: inView,
  })

  return (
    <section ref={ref}>
      {status === 'ready' && <h2>{count} comments</h2>}
      {comments.map((comment) => (
        <article key={comment.id}>{comment.authorName}</article>
      ))}
    </section>
  )
}
```

## What It Does

Comments are read from `/api/comments/`, which answers from the copy the site keeps. Nothing is asked for until `enabled` is true, so a visitor who never scrolls to the comments never loads them.

| Value | Meaning |
|---|---|
| `status` | `idle`, `loading`, `ready`, `unavailable` (the post has no comments to offer) or `error`. |
| `settings` | `{ open, canComment, threadDepth, requireNameEmail }`, or `null` until loaded. |
| `comments` | The comments to show, oldest first, as a flat list. Each has a `parent`. |
| `count` | How many approved comments the post has. Also written to `state.commentCounts[postId]`, which the post's toolbars show. |
| `announcement` | Words for a screen reader when new comments arrive. |
| `getToken()` | `{ value, at }`: the token for the form to send, and when it arrived. |
| `setToken(token)` | Replaces the token, after an answer that carried the next one. |
| `add(posted)` | Shows a comment the visitor has just posted. |
| `retry()` | Loads again after an error. |

## Keeping up to date

While `watching` is true and the tab is visible, the hook asks for new comments:

| When | How often |
|---|---|
| Something changed in the last 10 minutes | Every minute |
| Nothing has changed for 10 minutes | Every 2 minutes |
| Nothing has changed for 30 minutes | Every 5 minutes |

It stops when the tab is hidden or the comments are off screen, and asks at once on return if it is due. Asking never reaches WordPress. A comment another visitor posts appears by itself; one approved in WordPress appears after Revalidate is pressed on the post, or within a day.

## The visitor's own comments

- A comment WordPress **approved** is shown at once and kept for 5 minutes whether or not the server's list has it yet.
- A comment **held for moderation** is kept in the browser's `localStorage` and shown to its author only, with `status: 'pending'`. It is forgotten once it appears in the approved list, or after 30 days.

## Notes

- Client-only. Call it from a component in `src/components/`, not from a block.
- Pass `onBeforeChange` to be told just before the list changes, to note where the visitor is reading and keep them there.
- The token is single use. Every answer from `POST /api/comments/` carries the next one: pass it to `setToken`.

## Implementation

Used by `src/components/comments/index.tsx`.
