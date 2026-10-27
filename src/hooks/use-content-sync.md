# Use Content Sync

A React hook that runs Sync and Rebuild for the content index and reports their progress.

**Tier:** Free
**File:** `src/hooks/use-content-sync.tsx`

## Usage

```tsx
'use client'

import { useContentSync } from '@/hooks/use-content-sync'

export function SyncButton() {
  const { phase, message, progress, runSync } = useContentSync()

  return (
    <>
      <button onClick={runSync} disabled={phase === 'working'}>
        Sync
      </button>
      {progress && <span>{progress.label}</span>}
      {message && <span>{message}</span>}
    </>
  )
}
```

## What It Does

The content index is the copy of WordPress's posts, categories, tags and authors kept in D1. The hook drives `/api/sync`, one call after another, so no single request has to read all of WordPress.

| Function | What it does |
|---|---|
| `runSync()` | Picks up posts published or edited since the last sync. |
| `runRebuild()` | Reads every post, category, tag and author again, then removes what WordPress no longer has. |
| `confirmRemoval()` | Goes ahead when a rebuild stopped to ask before removing many posts. |
| `cancel()` | Stops a rebuild after the call in flight. Nothing is removed. |
| `reset()` | Returns to `idle` and clears the message. |

| Value | Meaning |
|---|---|
| `phase` | `idle`, `working`, `confirm`, `done`, `error` or `expired`. |
| `message` | The outcome, in words, once there is one. |
| `progress` | `{ label, fraction }` while working, otherwise `null`. |
| `changed` | `true` when the index changed and the page should be loaded again. |

## Notes

- Client-only. Call it from a component in `src/components/`, not from a block.
- The caller must be logged in: `/api/sync` checks the `wp_session` cookie with WordPress. When the login is no longer recognized, `phase` becomes `expired`.
- When WordPress refuses because it is busy, the call is waited out and tried again, up to five times.
- A rebuild removes nothing until its last call, so cancelling or closing the page part way leaves the index as it was, with the posts read so far brought up to date.

## Implementation

Used by `src/components/admin-bar.tsx`.
