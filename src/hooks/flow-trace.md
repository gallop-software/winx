# Flow Trace

FlowTrace reports each visit that converts (the contact form, a newsletter sign-up, a new account, an email or phone link, a tracked click): where the visitor came from, every page they saw, how long each page was in front of them, and what they did. The visit is kept in the visitor's browser while they read; when they convert, the whole visit is sent at once, stored in the site's D1 database, and emailed. Visits that never convert never leave the browser. Counting views and visits stays Analytics' (`src/hooks/page-view.tsx`, `src/utils/page-views.ts`); FlowTrace only ever stores visits that converted.

**File:** `src/hooks/flow-trace.tsx` (browser)
**File:** `src/app/api/flow-trace/route.ts` (endpoint)
**File:** `src/utils/flow-trace-*.ts` (config, store, emails, scheduled jobs)

## Usage

Mounted once, in `src/app/layout.tsx`:

```tsx
import FlowTrace from '@/hooks/flow-trace'

<FlowTrace />
```

It watches the path only, as the page-view hook does, so it adds nothing to the server-rendered page.

## What is recorded

| Step | When |
|---|---|
| `pageview` | Each route change, including client-side navigation, with the time the page was visible |
| `form` | `trackConversion('form', label)`, called by the Form component when the contact form is sent |
| `newsletter` | `trackConversion('newsletter', …)`, called by the Form component when a newsletter form succeeds |
| `signup` | `trackConversion('signup', …)`, called by the Form component when `/api/account/confirm` succeeds: the account exists once its password is chosen from the emailed link |
| `email` | A click on a `mailto:` link |
| `call` | A click on a `tel:` link |
| `click` | A click on an element with `.ft-tracking` or `data-ft="Label"` |

Pages are only kept in the browser. Each conversion sends the visit, whole.

Track anything else from code:

```tsx
import { trackConversion } from '@/hooks/flow-trace'

trackConversion('click', 'Downloaded the guide')
```

Or mark an element; `data-ft` names it in reports, otherwise its text is used:

```tsx
<a href="/guide.pdf" data-ft="Guide download">Download</a>
```

## How a visit is kept

All in `localStorage`:

- `ft_visitor`: the visitor id, and `ft_first`, when it was made.
- `ft_visits` and `ft_total_ms`: how many visits, and the time on the site over all of them.
- `ft_visit`: the visit under way: its id, referrer and campaign, and its steps (at most `maxSteps`; the oldest pages go first, conversions stay).

A new visit starts after `visitIdleMinutes` with nothing done, or when the visitor arrives from another site or with `utm_` parameters. A page that stays in front of the visitor counts as activity, so a long read and then a sign-up is one visit; a reload or the back button on the page they arrived at is not a new arrival. Where storage is blocked, the visit is kept in memory for as long as the page is open.

The same link pressed again within 5 seconds is one conversion. Paths, titles and labels are cut to what the server keeps before sending.

The visit goes out by `sendBeacon` as `text/plain`, so it is not lost when a phone link opens the dialer. Paths in `ignoredPaths` (`/api`, `/block`) are never traced.

## What the server adds

`/api/flow-trace` accepts only same-origin requests of at most 64 KB holding a conversion, with every path a path on this site; drops bots and administrators (their `gallop_member` cookie); stores at most 30 visits an hour from one address; and adds the country, region and city from Cloudflare's request data, the device, browser and system from the user agent, and the IP address. Nothing is sent to any other service. The visitor's clock may be wrong, so step times are laid back from the server's time of arrival. It answers at once, then stores the visit and emails the report.

## Configuration

All in `src/utils/flow-trace-config.ts`: the time zone, visit idle time, the most steps kept, the summary hour and weekday, the hourly report limits, the retry time, the default email setting, the ignored paths, and the names of the conversions. Who is emailed is `FLOWTRACE_EMAILS` (comma-separated), or `EMAIL_TO` when it is not set.

## Dependencies

- `next/navigation` for route changes
