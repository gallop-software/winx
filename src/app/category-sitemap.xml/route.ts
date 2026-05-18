import { baseURL } from '@/app/metadata'
import { getCategorySlugs } from '@/tools/get-category-slugs'
import { buildSitemapXml, xmlResponse } from '@/utils/sitemap-xml'

export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
  const { categorySlugs } = await getCategorySlugs()

  const xml = buildSitemapXml(
    categorySlugs.map((item) => ({
      url: `${baseURL}${item.uri}`,
    }))
  )

  return xmlResponse(xml)
}
