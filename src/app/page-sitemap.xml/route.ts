import { baseURL } from '@/app/metadata'
import { getPageSlugs } from '@/tools/get-page-slugs'
import { buildSitemapXml, xmlResponse } from '@/utils/sitemap-xml'

export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
  const { pageSlugs } = await getPageSlugs()

  const xml = buildSitemapXml(
    pageSlugs.map((item) => ({
      url: `${baseURL}${item.uri}`,
      lastmod: item.modified,
    }))
  )

  return xmlResponse(xml)
}
