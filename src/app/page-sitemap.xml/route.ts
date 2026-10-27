import { baseURL } from '@/app/metadata'
import { getPageSlugs } from '@/tools/get-page-slugs'
import { getSitemapPages } from '@/utils/pages'
import { buildSitemapXml, sitemapDate, xmlResponse } from '@/utils/sitemap-xml'

// The pages built into the site, then the WordPress pages from the content
// index, which only exists inside a request.
export const dynamic = 'force-dynamic'

export async function GET() {
  const [{ pageSlugs }, pages] = await Promise.all([
    getPageSlugs(),
    getSitemapPages(),
  ])

  // A WordPress page at a path the site builds itself (/essays/) is not a
  // second page.
  const builtIn = new Set(pageSlugs.map((item) => item.uri))
  const xml = buildSitemapXml([
    ...pageSlugs.map((item) => ({
      url: `${baseURL}${item.uri}`,
      lastmod: item.modified,
    })),
    ...pages
      .filter((page) => !builtIn.has(page.path))
      .map((page) => {
        const lastmod = sitemapDate(page.modified)
        return {
          url: `${baseURL}${page.path}`,
          ...(lastmod ? { lastmod } : {}),
        }
      }),
  ])

  return xmlResponse(xml)
}
