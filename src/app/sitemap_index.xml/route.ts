import { DateTime } from 'luxon'
import { baseURL } from '@/app/metadata'
import { getLastSyncedAt } from '@/utils/content-index'
import { buildSitemapIndexXml, xmlResponse } from '@/utils/sitemap-xml'

export const dynamic = 'force-dynamic'

export async function GET() {
  // The sitemaps of posts, terms and authors change when the content index
  // does, which is when it was last synced.
  const synced = (await getLastSyncedAt()) ?? DateTime.utc().toISO() ?? ''
  const lastmod = synced ? { lastmod: synced } : {}

  const xml = buildSitemapIndexXml([
    { loc: `${baseURL}/post-sitemap.xml`, ...lastmod },
    { loc: `${baseURL}/page-sitemap.xml` },
    { loc: `${baseURL}/category-sitemap.xml`, ...lastmod },
    { loc: `${baseURL}/post_tag-sitemap.xml`, ...lastmod },
    { loc: `${baseURL}/author-sitemap.xml`, ...lastmod },
  ])

  return xmlResponse(xml)
}
