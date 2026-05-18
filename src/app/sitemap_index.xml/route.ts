import { baseURL } from '@/app/metadata'
import { buildSitemapIndexXml, xmlResponse } from '@/utils/sitemap-xml'

export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
  const now = new Date().toISOString()

  const xml = buildSitemapIndexXml([
    { loc: `${baseURL}/post-sitemap.xml`, lastmod: now },
    { loc: `${baseURL}/page-sitemap.xml`, lastmod: now },
    { loc: `${baseURL}/category-sitemap.xml`, lastmod: now },
    { loc: `${baseURL}/post_tag-sitemap.xml`, lastmod: now },
    { loc: `${baseURL}/author-sitemap.xml`, lastmod: now },
  ])

  return xmlResponse(xml)
}
