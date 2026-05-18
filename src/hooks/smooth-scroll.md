# Smooth Scroll

A client-side hook that enables smooth scrolling behavior for anchor links with an automatic offset adjustment.

**Tier:** Free  
**File:** `src/hooks/smooth-scroll.tsx`

## Usage

```tsx
import SmoothScroll from '@/hooks/smooth-scroll'

export default function Layout() {
  return (
    <>
      <SmoothScroll />
      {/* Your content */}
    </>
  )
}
```

## Features

- Automatically attaches smooth scroll behavior to all anchor links (`a[href^="#"]`)
- Applies a 40px offset from the top when scrolling to anchors
- Updates the URL hash in browser history
- Dynamically observes DOM changes to attach listeners to new links
- Opt-out available by adding `no-anchor-scroll` class to specific links
- Reattaches listeners on route changes via Next.js pathname monitoring
- Prevents sticky navbar from appearing during smooth scroll animation

## How it Works

1. Detects clicks on anchor links starting with `#`
2. Prevents default browser jump behavior
3. Sets `scrollingDirection` to `'down'` and locks it via `lockScrollDirection`
4. Smoothly scrolls to the target element with offset
5. Updates the URL without page reload
6. Uses MutationObserver to handle dynamically added links
7. Unlocks scroll direction on `scrollend` event

## Excluding Links

To exclude specific links from smooth scrolling, add the `no-anchor-scroll` class:

```tsx
<a
  href="#section"
  className="no-anchor-scroll"
>
  Jump without smooth scroll
</a>
```

## Navbar Integration

When an anchor link is clicked, the hook:

1. Sets `state.scrollingDirection` to `'down'`
2. Sets `state.lockScrollDirection` to `true`

This prevents the sticky navbar from appearing during smooth scroll (since it only shows when direction is `'up'`). The lock is released when the `scrollend` event fires, restoring normal scroll direction detection.

## Implementation

The component is used in `src/app/layout.tsx` to enable smooth scrolling throughout the application.
