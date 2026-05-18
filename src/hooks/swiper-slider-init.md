# Swiper Slider Init

A client-side hook that initializes and manages Swiper slider instances with fade effects, autoplay, and intersection observer optimization.

**Tier:** Free  
**File:** `src/hooks/swiper-slider-init.tsx`

## Usage

```tsx
import SwiperSliderInit from '@/hooks/swiper-slider-init'

export default function MySlider() {
  return (
    <>
      <div
        id="my-slider"
        className="swiper"
      >
        <div className="swiper-wrapper">
          <div>Slide 1</div>
          <div>Slide 2</div>
          <div>Slide 3</div>
        </div>
        <div className="swiper-pagination"></div>
      </div>
      <SwiperSliderInit swiperId="my-slider" />
    </>
  )
}
```

## Props

- `swiperId` (string, required): The ID of the HTML element that contains the Swiper slider

## Features

- Initializes Swiper with fade effect transitions
- Automatic height adjustment
- Loop mode enabled
- Autoplay with 4.5 second delay
- Clickable pagination dots
- IntersectionObserver to pause autoplay when slider is not visible
- Prevents multiple initializations with ref tracking

## Configuration

The Swiper is configured with:

- **Effect**: Fade with cross-fade enabled
- **Autoplay delay**: 4500ms
- **Loop**: Enabled
- **Observer**: Watches for DOM changes
- **Space between**: 30px
- **Auto height**: Enabled

## Implementation

The component is used in `src/components/swiper.tsx` to initialize slider functionality.

---

## Technical Notes

### Why Autoplay is Disabled by Default

Autoplay is initialized as `false` and only enabled when the swiper enters the viewport. This is intentional and should not be changed.

**Problem:** When autoplay runs on a swiper that is not in view, the slide transitions can cause height changes (especially with `autoHeight: true`). These height changes trigger browser scroll events, which the `useOffsetTop` hook interprets as user scrolling. This caused the sticky navbar to appear unexpectedly—even when the user wasn't scrolling.

**Solution:** By disabling autoplay until the swiper is actually visible:

1. No unnecessary animations run off-screen
2. No phantom scroll events are triggered
3. The sticky navbar only appears from actual user scroll actions

See the `inView` effect that configures and starts autoplay only when the swiper enters the viewport.
