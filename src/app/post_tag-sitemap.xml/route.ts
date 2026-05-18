import { baseURL } from '@/app/metadata'
import { getTagSlugs } from '@/tools/get-tag-slugs'
import { buildSitemapXml, xmlResponse } from '@/utils/sitemap-xml'

export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
  const { tagSlugs } = await getTagSlugs()

  const xml = buildSitemapXml(
    tagSlugs.map((item) => ({
      url: `${baseURL}${item.uri}`,
    }))
  )

  return xmlResponse(xml)
}
