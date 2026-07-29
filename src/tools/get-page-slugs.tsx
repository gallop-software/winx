// Page routes are scanned at build time by _scripts/generate-page-metadata.mjs
// and imported here so they are bundled. Scanning src/app from a route handler
// throws ENOENT on Cloudflare Workers, which has no filesystem at runtime.
import pagesData from '@/../_data/_pages.json'

type PageSlugItem = {
  slug: string
  modified: string
  uri: string
}

export async function getPageSlugs(): Promise<{ pageSlugs: PageSlugItem[] }> {
  return { pageSlugs: pagesData as PageSlugItem[] }
}
