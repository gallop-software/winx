# generate-block-index.mjs

Regenerate the block import map that powers the `/block/{slug}` demo preview route.

**Tier:** Internal  
**File:** `_scripts/generate-block-index.mjs`

---

## Usage

```bash
npm run blocks
```

## What It Does

1. **Scans block files** — recursively reads every `.tsx` file in `src/app/**/_blocks/`
2. **Derives slugs** — converts each route path to a URL slug (stripping route-group parentheses) and deduplicates shared blocks
3. **Writes the index** — generates `src/app/(demo)/block/[[...slug]]/_block-index.ts`, a `blockImports` map (slug → dynamic `import()`) plus a `blockSlugs` array

The demo route uses this to statically generate and render each block preview. Block/layout screenshots are produced on the gallop.software side, so this script no longer captures images or writes a markdown catalog.

## Output

`src/app/(demo)/block/[[...slug]]/_block-index.ts` — auto-generated, do not edit by hand.

---

[← Back to README](../README.md)
