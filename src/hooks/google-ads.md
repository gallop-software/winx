# Google Ads

A Next.js component that integrates Google Ads tracking and configuration into your application.

**Tier:** Free  
**File:** `src/hooks/google-ads.tsx`

## Usage

```tsx
import GoogleAds from '@/hooks/google-ads'

export default function Layout() {
  return (
    <>
      <GoogleAds adId="YOUR-AD-ID" />
      {/* Your content */}
    </>
  )
}
```

## Props

- `adId` (string, required): Your Google Ads tracking ID
- `loadGtagJs` (boolean, optional): Whether to load the gtag.js script. Defaults to `true`. Set to `false` if the script is already loaded elsewhere to avoid duplicates.

## Features

- Automatically loads Google Tag Manager script
- Configures Google Ads tracking with your Ad ID
- Uses Next.js Script component for optimal loading strategy
- Prevents duplicate script loading with optional `loadGtagJs` flag

## Implementation

The component is used in `src/app/layout.tsx` to add Google Ads tracking across the entire application.
