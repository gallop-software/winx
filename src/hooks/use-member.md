# Use Member

A React hook that tells a component who is logged in, and lets it log them out or open the login dialog.

**Tier:** Free
**File:** `src/hooks/use-member.tsx`

## Usage

```tsx
import { useMember } from '@/hooks/use-member'

export function Greeting() {
  const { member, loaded, openLogin } = useMember()
  if (!loaded) return null
  return member ? <p>Hello {member.name}</p> : <button onClick={openLogin}>Log in</button>
}
```

## What It Does

On the first page load it asks `/api/account/me/`, which reads the session cookie and answers without asking WordPress. The answer is kept in the store (`state.member`, `state.memberLoaded`), so every component that calls the hook shares one request.

| Value | Meaning |
|---|---|
| `member` | `{ id, name, avatar, isAdmin, subscribed }`, or `null` when nobody is logged in. Never the email address. |
| `loaded` | Whether the answer has arrived. Until then `member` is `null`. |
| `refresh()` | Asks again, after something changed the session. |
| `logOut()` | Clears the member at once and tells the site to end the session in this browser. |
| `openLogin()` | Opens the login dialog, wherever it is on the page. |

The login dialog and the profile page write to `state.member` themselves when a login or a save succeeds.

Used by `src/components/member-card.tsx`, `src/components/admin-bar.tsx`, and the comment form.
