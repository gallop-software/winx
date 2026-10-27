# Use Mailing

React hooks behind the marketing email dialog: calling its routes, and sending a campaign a few emails at a time.

**Tier:** Free
**File:** `src/hooks/use-mailing.tsx`

## Usage

```tsx
'use client'

import { useCampaignSend } from '@/hooks/use-mailing'

export function SendPanel({ campaignId }: { campaignId: number }) {
  const { phase, campaign, message, start, pause } = useCampaignSend()

  return (
    <>
      <button onClick={() => start(campaignId)} disabled={phase === 'sending'}>
        Send
      </button>
      {phase === 'sending' && <button onClick={pause}>Pause</button>}
      {campaign && <span>{campaign.totals.sent} sent</span>}
      {message && <span>{message}</span>}
    </>
  )
}
```

## What It Does

| Export | What it does |
|---|---|
| `mailingCall(url, { method, body })` | One call to a route under `/api/mailing`. Waits out a busy WordPress and tries again, up to five times. Throws `MailingSessionExpired` when the login is no longer an administrator's. |
| `useCampaignSend()` | Drives `/api/mailing/campaigns/[id]/send`, one call after another. Returns `phase` (`idle`, `sending`, `paused`, `done`, `error`, `expired`), the `campaign` with its totals as they change, `message`, `start(id)`, `pause()` and `reset()`. |

## Notes

- Client-only. Call it from a component in `src/components/`, not from a block.
- Administrators only: every route asks WordPress whether the person still is one.
- Each send call sends a few emails with a pause between them, so the page must stay open while a campaign goes out. Closing it, pausing, or reaching Cloudflare's daily limit leaves the campaign paused; `start(id)` again sends only to those not yet sent to.

## Implementation

Used by `src/components/mailing/`, opened by the Marketing email button in `src/components/admin-bar.tsx`.
