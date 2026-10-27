# Use Subscribers

React hooks for the mailing list: a page of subscribers, and actions on many of them at once.

**Tier:** Free
**File:** `src/hooks/use-subscribers.tsx`

## Usage

```tsx
'use client'

import { useState } from 'react'
import { actOnSubscribers, useSubscriberList, type SubscriberQueryState } from '@/hooks/use-subscribers'

export function Pending() {
  const [query] = useState<SubscriberQueryState>({
    status: 'pending',
    search: '',
    sort: 'added',
    descending: true,
    page: 1,
  })
  const { rows, total, reload } = useSubscriberList(query)

  return (
    <>
      <span>{total} waiting to confirm</span>
      <button
        onClick={async () => {
          await actOnSubscribers('resend', { query: { status: 'pending', search: '' } })
          reload()
        }}
      >
        Resend all
      </button>
      {rows.map((row) => <div key={row.id}>{row.email}</div>)}
    </>
  )
}
```

## What It Does

| Export | What it does |
|---|---|
| `useSubscriberList(query)` | Reads one page of `/api/mailing/subscribers` for a status, a search, a sort and a page, again whenever one changes. Typing in the search is waited on for 300 ms. Returns `rows`, `total`, `counts` (per status), `perPage`, `loading`, `error`, `expired` and `reload()`. |
| `actOnSubscribers(action, selection, options)` | `unsubscribe`, `resubscribe`, `delete` or `resend` for `{ ids }` or for everyone matching `{ query }`. Resubscribing needs `consent: true`, and `includeComplaints: true` to include those who reported spam. Resending goes a few at a time until none are left. Returns how many changed. |
| `EMPTY_COUNTS` | Counts of zero, for before the first answer. |

## Notes

- Client-only. Call it from a component in `src/components/`, not from a block.
- Administrators only: every route asks WordPress whether the person still is one. `expired` becomes `true` when the login is no longer accepted.
- The list is the site's own, in D1. It never reads WordPress users.

## Implementation

Used by `src/components/subscribers/` (the Subscribers tab of the marketing dialog) and the Audience tab in `src/components/mailing/`.
