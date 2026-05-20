# bust-kv-cache.mjs

Invalidate the Vercel KV (Upstash Redis) cache for blog likes and share counts. The next read per post rehydrates from Postgres via the cache-aside helpers in `src/utils/blog-likes.ts` and `src/utils/blog-shares.ts`.

**Tier:** Pro
**File:** `_scripts/bust-kv-cache.mjs`

---

## Usage

```bash
npm run bust:kv                     # wipe every post listed in _data/_blog.json
npm run bust:kv -- --posts=12,34    # wipe specific post IDs
npm run bust:kv -- --dry-run        # preview keys without deleting
```

Flags can be combined: `npm run bust:kv -- --posts=12,34 --dry-run`.

## What It Does

1. Loads `KV_REST_API_URL` and `KV_REST_API_TOKEN` from `.env.local` (falling back to `.env`).
2. Determines the target post IDs:
   - `--posts=` — uses the IDs you pass.
   - otherwise — reads every `id` from `_data/_blog.json`.
3. For each post, deletes three keys in a single `DEL` call:
   - `likes:{id}` — set of `anon_id`s that liked the post
   - `like_count:{id}` — cached like total
   - `share_count:{id}` — cached share total
4. Prints how many keys were actually removed per post and a final tally.

`--dry-run` skips the `DEL` and logs the keys it _would_ remove.

## Requirements

- `_data/_blog.json` must exist when running without `--posts=`. Run `npm run blog` first if missing.
- Env vars `KV_REST_API_URL` and `KV_REST_API_TOKEN` must be set (the script exits 1 otherwise). For production keys, pull them with `vercel env pull .env.local` before running.

## When to Run

- After a bulk admin edit or backfill that bypassed the normal `invalidate*` helpers.
- After a Postgres restore or migration that changed `blog_like` / `blog_share_intents` rows out-of-band.
- When debugging a stuck count and you want a known-clean cache state.
- **Not** for normal like/unlike or share flows — those already call `invalidateLike` / `invalidateShare` in-request.

## Why This Exists

Postgres is the source of truth; KV is a 24-hour cache-aside layer. Every in-app write path is responsible for busting its own KV keys. This script is the break-glass tool for the cases where that contract was bypassed — there is intentionally no `FLUSHDB` in production code, so out-of-band fixes need a deliberate, auditable invalidation step.

## Safety Notes

- The script only ever issues `DEL` — it never writes. Worst case after a misfire is a brief cold-cache penalty as readers repopulate from Postgres.
- Running against the wrong environment is the real risk. Confirm `KV_REST_API_URL` points at the intended store before running without `--dry-run`.
- The script does not invalidate any other key prefix. If you add new cached counters (see `src/utils/kv.ts`), extend `keysForPost()` here too.
