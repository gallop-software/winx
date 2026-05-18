# generate-search.sh

Build FlexSearch index for client-side site search.

**Tier:** Free  
**File:** `_scripts/generate-search.sh`  
**File:** `_scripts/generate-search.mjs`

---

## Usage

```bash
npm run search
```

## What It Does

1. **Builds your site** - Runs `npm run build` to ensure latest content
2. **Starts temporary server** - Launches production server on port 3000
3. **Crawls all pages** - Discovers and fetches all content files
4. **Extracts content** - Pulls text from `<main>` element (excludes nav/footer)
5. **Sections content** - Splits by headings (h1-h6) for granular search
6. **Generates index** - Creates `public/search-index.json`
7. **Stops server** - Cleans up temporary server process

## Requirements

- Port 3000 must be available
- Site must build successfully
- Content files must exist in `src/content/`

## Output Structure

Generates `public/search-index.json`:

```json
{
  "pages": [
    {
      "title": "Page Title",
      "url": "/page-url",
      "sections": [
        {
          "heading": "Section Heading",
          "content": "Section text content..."
        }
      ]
    }
  ]
}
```

## Search Implementation

The generated index is consumed by FlexSearch on the client side:

- Fast, client-side full-text search
- No server required for search queries
- Works offline after initial page load
- Section-level results with context

## When to Run

- After adding new pages
- After updating page content
- Before deploying to production
- When search results seem stale

## Troubleshooting

**Port 3000 already in use:**

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Server fails to start:**

- Ensure `npm run build` completes successfully
- Check for syntax errors in content files
- Verify no other dev server is running

**Empty search index:**

- Verify content files exist in `src/content/`
- Check that content is wrapped in `<main>` tags
- Ensure headings (h1-h6) are present for sections

---

**See also:**

- [Search Component](../src/components/) - Search UI implementation
