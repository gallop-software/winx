# Use Lightbox

A React hook that provides state management for a dynamically loaded lightbox component using `yet-another-react-lightbox`.

**Tier:** Free  
**File:** `src/hooks/use-lightbox.tsx`

## Usage

```tsx
import useLightbox from '@/hooks/use-lightbox'

export default function Gallery() {
  const { openLightbox, renderLightbox } = useLightbox()

  return (
    <>
      <button onClick={openLightbox}>Open Lightbox</button>

      {renderLightbox({
        slides: [
          { src: '/images/photo1.jpg' },
          { src: '/images/photo2.jpg' },
          { src: '/images/photo3.jpg' },
        ],
      })}
    </>
  )
}
```

## API

### Returns

- `openLightbox`: Function to open the lightbox
- `renderLightbox`: Function that renders the lightbox component with provided props

### renderLightbox Props

Accepts all props from `yet-another-react-lightbox` except `open` and `close`, including:

- `slides`: Array of slide objects with image sources
- `index`: Starting slide index
- `plugins`: Array of lightbox plugins
- And more (see [yet-another-react-lightbox documentation](https://github.com/igordanchenko/yet-another-react-lightbox))

## Features

- Dynamic import of lightbox component for code splitting
- Manages open/closed state internally
- Prevents unnecessary renders with interactive state tracking
- Built on top of `yet-another-react-lightbox` for full-featured image galleries

## Note

This hook is currently **not used** in the codebase but is available for implementing image lightbox functionality.
