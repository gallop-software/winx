import { baseURL } from '@/app/metadata'
import { getSitemapTerms } from '@/utils/content-index'
import { buildSitemapXml, sitemapDate, xmlResponse } from '@/utils/sitemap-xml'

// Built on each request from the content index, so a new term is listed as
// soon as enough posts that use it have been synced.
export const dynamic = 'force-dynamic'

export async function GET() {
  const terms = await getSitemapTerms('post_tag')

  const xml = buildSitemapXml(
    terms.map((term) => {
      const lastmod = sitemapDate(term.modified)
      return {
        url: `${baseURL}/tag/${term.slug}`,
        ...(lastmod ? { lastmod } : {}),
      }
    })
  )

  return xmlResponse(xml)
}
