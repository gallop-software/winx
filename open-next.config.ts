// See https://opennext.js.org/cloudflare for configuration options.
import { defineCloudflareConfig } from '@opennextjs/cloudflare'
// No incremental cache is configured, so ISR and on-demand revalidation
// (`revalidate`, /api/revalidate) are no-ops on Workers — pages are served as
// built. To turn ISR on, create an R2 bucket, bind it as
// NEXT_INC_CACHE_R2_BUCKET in wrangler.jsonc, and uncomment both lines below:
// import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'

export default defineCloudflareConfig({
  // incrementalCache: r2IncrementalCache,
})
