# Flow Trace

A client-side analytics hook that tracks user navigation paths, time spent on pages, and interaction events with support for session management and traffic source attribution.

**Tier:** Pro  
**File:** `src/hooks/flow-trace.tsx`  
**File:** `src/app/api/flow-trace/route.ts`

## Usage

```tsx
import { FlowTrace } from '@/hooks/flow-trace'

export default function Layout() {
  return (
    <>
      <Suspense>
        <FlowTrace />
      </Suspense>
      {/* Your content */}
    </>
  )
}
```

## Features

- **Path Tracking**: Records complete navigation history with timestamps
- **Time Measurement**: Tracks time spent on each page using Luxon with timezone support (America/Chicago)
- **Session Management**: Distinguishes first-time vs returning visitors
- **Traffic Source Attribution**: Captures UTM parameters and referrer information
- **Interaction Tracking**: Monitors clicks on elements with `.ft-tracking` class
- **Non-blocking Telemetry**: Uses `sendBeacon` or `fetch` with keepalive for reliable data transmission
- **Storage Management**: Uses localStorage for persistent data and sessionStorage for session-specific data

## Storage Keys

### localStorage

- `ft_path`: Navigation path history (JSON array)
- `ft_first`: First seen timestamp
- `ft_time_spent_ms`: Total time spent across all sessions
- `ft_session_source`: Source attribution for current session

### sessionStorage

- `ft_session_start`: Current session start timestamp
- `ft_last_interaction`: Last interaction timestamp

## How it Works

1. **Page Views**: Automatically recorded on route changes (Next.js pathname/searchParams)
2. **Time Attribution**: Calculates time delta between interactions using Luxon DateTime
3. **Source Detection**: Identifies traffic source from UTM parameters or referrer
4. **Session Attribution**: Marks first external arrival in each session
5. **Click Tracking**: Listens for clicks on `.ft-tracking` elements with 5-second debounce
6. **Data Transmission**: Sends analytics payload to `/api/flow-trace` endpoint

## Payload Structure

```ts
{
  firstSeen: string,              // ISO timestamp of first visit
  sessionStart: string,           // ISO timestamp of session start
  timeSpentTotalMs: number,       // Total time spent (all sessions)
  page: {
    url: string,                  // Current page URL
    title: string                 // Page title
  },
  path: [
    {
      path: string,               // Full path with query & hash
      ts: string,                 // ISO timestamp
      spentMs: number,            // Time spent on this page
      source?: string             // Traffic source (if new arrival)
    }
  ]
}
```

## Interaction Tracking

Add the `ft-tracking` class to elements you want to track:

```tsx
<a
  href="/contact"
  className="ft-tracking"
>
  Contact Us
</a>

<button
  className="ft-tracking"
  id="newsletter-signup"
>
  Subscribe
</button>
```

Click payloads include:

- `element.href`: Link destination (if anchor)
- `element.innerText`: Element text content
- `element.id`: Element ID
- `context`: Complete analytics payload

## Configuration

- **Default Endpoint**: `/api/flow-trace`
- **Max Path Length**: 100 entries (FIFO)
- **Click Debounce**: 5000ms per element
- **Timezone**: America/Chicago (configurable via `zone` constant)

## Source Attribution

Traffic sources are determined in priority order:

1. UTM source parameter (`utm_source`)
2. Document referrer
3. "direct" (default)

External sources are validated to exclude:

- "direct"
- localhost
- Current production URL (from `NEXT_PUBLIC_PRODUCTION_URL`)

## Implementation

The component is used in `src/app/layout.tsx` to enable flow tracking throughout the application.

## Dependencies

- `next/navigation` for route change detection
- `luxon` for timezone-aware datetime handling
