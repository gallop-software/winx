# Use Categories

A React hook that loads the site's categories from the content index and keeps them in global state.

**Tier:** Free
**File:** `src/hooks/use-categories.tsx`

## Usage

```tsx
'use client'

import { useCategories } from '@/hooks/use-categories'

export function CategoryLinks() {
  const categories = useCategories()

  return categories
    .filter((c) => c.count > 0)
    .map((c) => <a key={c.slug} href={`/category/${c.slug}`}>{c.name}</a>)
}
```

The hook returns an empty array until the categories have loaded, then `{ name, slug, count }` for each category, ordered by name.

## What It Does

On mount, the hook requests `/api/categories/` once and writes the result to `state.categories` in the valtio store at `src/state.ts`. Every component that calls the hook shares that one request and re-renders when the categories arrive.

## Global State Updates

- `state.categories` — `null` until loaded, then the list of categories.

## Notes

- Client-only. Server components read categories with `getAllCategories()` from `src/utils/taxonomies.ts` instead.
- The categories come from the content index in D1, so a category added in WordPress appears after the next Sync. The response is cached by the browser for 60 seconds.
- If the request fails, the list stays empty and the next component to mount tries again.

## Implementation

Used by `src/components/navigation.tsx` and `src/components/category-dropdown.tsx`.
