# Use Offset Top

A React hook that tracks scroll position and direction, updating global state for use across components.

**Tier:** Free  
**File:** `src/hooks/use-offset-top.tsx`

## Usage

```tsx
import useOffsetTop from '@/hooks/use-offset-top'

export default function Navbar() {
  useOffsetTop(100) // Trigger at 100px scroll

  return <nav>{/* Your navbar content */}</nav>
}
```

## Parameters

- `top` (number, optional): The scroll threshold in pixels. Defaults to `100`. When scroll position exceeds this value, `state.isScrolling` becomes `true`.

## Global State Updates

The hook updates the following properties in the global `state` object:

- `state.offsetTop`: Current scroll position (window.scrollY)
- `state.lastOffsetTop`: Previous scroll position
- `state.scrollingDirection`: Current direction ('up', 'down', or 'none')
- `state.lastScrollingDirection`: Previous scroll direction
- `state.isScrolling`: Boolean indicating if scrolled past the threshold (only when `state.dialogOpen` is false)
- `state.lockScrollDirection`: When `true`, prevents direction updates (used during smooth scroll)

## Features

- Tracks scroll position in real-time
- Detects scroll direction (up, down, or none)
- Provides threshold-based scrolling state
- Respects dialog open state (won't update `isScrolling` when dialog is open)
- Respects `lockScrollDirection` flag (won't update direction when locked)
- Uses passive event listener for better performance
- Automatically cleans up event listeners on unmount

## Use Cases

- Showing/hiding sticky navigation bars
- Changing navbar appearance on scroll
- Triggering animations based on scroll position
- Implementing scroll-to-top buttons
- Managing scroll-dependent UI states

## Implementation

The hook is used in `src/components/navbar/index.tsx` to manage navigation bar behavior based on scroll position.
