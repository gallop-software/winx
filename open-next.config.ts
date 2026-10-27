// See https://opennext.js.org/cloudflare for configuration options.
import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

// What little is prerendered is served read-only from Workers static assets.
// Posts, pages and every list of posts read the content index, so they render
// on the Worker and are kept by its own page cache (src/utils/page-cache.ts,
// in front of Next.js in worker.ts); a new post shows after Sync, without a
// deploy.
//
// The app still sets `revalidate`, but nothing can be regenerated into a
// read-only cache, and OpenNext's default queue throws on every stale request,
// so the queue is a deliberate no-op. /api/revalidate is a no-op for the same
// reason. For real ISR, switch to the R2 incremental cache with a queue and
// tag cache: https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
  queue: {
    name: 'noop',
    send: async () => {},
  },
})
