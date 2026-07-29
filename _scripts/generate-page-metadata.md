# generate-page-metadata.mjs

Scan `src/app` for static page routes and write the list to `_data/_pages.json`.

**Tier:** Internal  
**File:** `_scripts/generate-page-metadata.mjs`

---

## Usage

```bash
npm run pages
```

Runs automatically as part of `npm run build` and `npm run cf:build`.

## What It Does

1. **Walks the route groups** — reads every parentheses folder directly under `src/app/`, skipping `(demo)`
2. **Collects page routes** — records each folder containing a `page.tsx`, plus the route group's own `page.tsx` as the home page. Dynamic segments (`[slug]`), nested route groups, `api/`, and `post/` are skipped
3. **Reads last-modified times** — takes each `page.tsx` file's mtime as the route's `modified` date
4. **Deduplicates** — several route groups can each define a home page; the first `/` wins
5. **Writes the JSON** — `_data/_pages.json`, an array of `{ slug, modified, uri }`

## Output

`_data/_pages.json`:

```json
[
  {
    "slug": "",
    "modified": "2026-07-29T18:22:04.000Z",
    "uri": "/"
  },
  {
    "slug": "contact",
    "modified": "2026-07-14T09:11:47.000Z",
    "uri": "/contact"
  }
]
```

## Why It Exists

`page-sitemap.xml` needs each page's URI and last-modified date. Scanning the
filesystem from a route handler works on Node but throws `ENOENT` on Cloudflare
Workers, which has no filesystem at runtime. Generating the list at build time
lets `src/tools/get-page-slugs.tsx` import it, so the sitemap renders
identically on Vercel and Workers.

## Notes

- `_data/_pages.json` is generated — never edit it by hand
- Add or remove a page route and the next build picks it up; run `npm run pages`
  if you want the file refreshed without a full build
