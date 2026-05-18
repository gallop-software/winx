import { baseURL } from '@/app/metadata'
import { getPostSlugs } from '@/tools/get-post-slugs'
import { buildSitemapXml, xmlResponse } from '@/utils/sitemap-xml'

export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
  const { postSlugs } = await getPostSlugs()

  const xml = buildSitemapXml(
    postSlugs.map((item) => ({
      url: `${baseURL}${item.uri}`,
      lastmod: item.modified,
    }))
  )

  return xmlResponse(xml)
}
