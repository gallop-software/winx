# generate-blocks-catalog.mjs

Generate and maintain the blocks catalog with screenshots and metadata.

**Tier:** Internal  
**File:** `_scripts/generate-blocks-catalog.mjs`

---

## Usage

```bash
# Standard: Update catalog and capture missing screenshots
npm run blocks

# Force regenerate all screenshots
npm run blocks:screenshots

# Sort blocks naturally (ignores saved order)
npm run blocks:sort
```

## What It Does

1. **Scans block files** - Reads all `.tsx` files from `src/blocks/`
2. **Preserves tier settings** - Maintains Free/Pro designations from existing README
3. **Preserves order** - Keeps manually arranged block order within categories
4. **Captures screenshots** - Takes screenshots of missing block previews
5. **Generates catalog** - Updates `src/blocks/README.md` with:
   - Block statistics (total, free, pro counts)
   - Category groupings
   - Individual block entries with screenshots
   - Block metadata (slug, tier)

## Commands

### `npm run blocks`

**Mode:** Smart (default)

- Updates the catalog
- Only captures screenshots for blocks that don't have images yet
- Preserves existing block order and tier settings
- **Use this** for regular updates

### `npm run blocks:screenshots`

**Mode:** Force

- Updates the catalog
- Regenerates ALL screenshots (overwrites existing)
- Preserves existing block order and tier settings
- **Use this** when:
  - Block designs have changed
  - Screenshot quality needs improvement
  - Images appear corrupted

### `npm run blocks:sort`

**Mode:** Natural sort

- Updates the catalog
- Sorts all blocks naturally (hero-1, hero-2, ..., hero-10)
- Ignores manually saved order
- Only captures missing screenshots
- **Use this** when:
  - Starting fresh with block organization
  - Want to reset to default alphabetical order

## Output

### Catalog (`src/blocks/README.md`)

Generated markdown file with:

```markdown
# Speedwell Blocks

A collection of X pre-built UI blocks...

## Overview

- Total Blocks: X
- Free Blocks: X
- Pro Blocks: X

## Categories

- Hero: X blocks
- Section: X blocks ...

## Blocks

### Hero

#### Hero 1

<img src="..." alt="Hero 1" width="350">
**Slug:** `hero-1`
**Tier:** Free
---
```

### Screenshots (`public/blocks/`)

JPEG images sized to 700px on longest side:

```
public/blocks/
├── hero-1.jpg
├── hero-2.jpg
├── section-1.jpg
└── ...
```

## Configuration

### Category Order

Edit the `CATEGORY_ORDER` array in the script to customize category sorting:

```javascript
const CATEGORY_ORDER = [
  'hero',
  'section',
  'content',
  'call-to-action',
  'testimonial',
  'contact',
  // ... add more
]
```

Categories not in this list are sorted alphabetically after ordered ones.

### Screenshot Settings

Adjust constants at the top of the script:

```javascript
const BASE_URL = 'https://speedwell.gallop.software'
const FULL_SIZE = 700 // Max size on longest side
```

## Block Tiers

Blocks can be marked as **Free** or **Pro**. The script:

1. Reads existing tier assignments from `src/blocks/README.md`
2. Defaults new blocks to **Free**
3. Preserves tier settings across regenerations

To change a block's tier, edit it in the generated README and it will be preserved.

## Block Order

The script preserves block order within each category:

1. **Between categories** - Sorted by `CATEGORY_ORDER`, then alphabetically
2. **Within categories** - Preserves order from existing README
3. **New blocks** - Added at end of category, sorted naturally

Use `npm run blocks:sort` to reset to natural sorting.

## Prerequisites

- Development server running at `BASE_URL`
- Puppeteer installed (`npm install`)
- Sharp installed (`npm install`)

## Troubleshooting

### Screenshots not capturing

**Check:**

- Development server is running (`npm run dev`)
- `BASE_URL` in script matches your dev server
- Block routes are accessible at `/block/[slug]`
- Wait for network idle timeout (30s)

### Missing blocks

- Ensure block files end in `.tsx`
- Block files should be in `src/blocks/`
- Filenames should follow pattern: `category-number.tsx`

### Wrong order

- Run `npm run blocks:sort` to reset to natural sorting
- Manually arrange in README then run `npm run blocks` to preserve

---

[← Back to README](../README.md)
