import { baseURL } from '@/app/metadata'
import { getSitemapAuthors } from '@/utils/content-index'
import { buildSitemapXml, sitemapDate, xmlResponse } from '@/utils/sitemap-xml'

// Built on each request from the content index.
export const dynamic = 'force-dynamic'

export async function GET() {
  const authors = await getSitemapAuthors()

  const xml = buildSitemapXml(
    authors.map((author) => {
      const lastmod = sitemapDate(author.modified)
      return {
        url: `${baseURL}/author/${author.slug}`,
        ...(lastmod ? { lastmod } : {}),
      }
    })
  )

  return xmlResponse(xml)
}
