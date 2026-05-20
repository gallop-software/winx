# Use Logged In

A React hook that syncs the user's logged-in status from `localStorage` into global state on mount.

**Tier:** Free
**File:** `src/hooks/use-logged-in.tsx`

## Usage

```tsx
'use client'

import { useLoggedIn } from '@/hooks/use-logged-in'
import { useSnapshot } from 'valtio'
import { state } from '@/state'

export default function Login() {
  useLoggedIn()
  const { isLoggedIn } = useSnapshot(state)

  return isLoggedIn ? <LogoutButton /> : <LoginButton />
}
```

Call the hook once near the top of a client component that needs to react to login state. Any other component on the page can then read `state.isLoggedIn` via `useSnapshot(state)` without calling the hook again.

## What It Does

On mount, the hook reads the `wpToken` entry from `localStorage` and writes `state.isLoggedIn = !!token` into the valtio store at `src/state.ts`. The effect has an empty dependency array — it runs once per mount and does not re-check the token.

## Global State Updates

- `state.isLoggedIn` — `true` if `localStorage.wpToken` is present, otherwise `false`.

## Notes

- Client-only. The hook touches `localStorage`, so it must run inside a `'use client'` component. Per Canon Pattern 001, blocks are server components — call this hook from a component in `src/components/`, not from a block.
- One-shot. The hook does not listen for `storage` events or token changes mid-session. If you sign in or out without a page reload, update `state.isLoggedIn` directly at the call site of the auth action.
- Not an auth check. `wpToken` presence is a UI hint, not a security boundary. Always re-verify the token on the server before returning gated data.

## Implementation

Currently used by `src/components/login.tsx` to flip the login/logout UI on first render.
