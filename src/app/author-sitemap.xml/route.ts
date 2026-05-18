import { baseURL } from '@/app/metadata'
import { getAuthorSlugs } from '@/tools/get-author-slugs'
import { buildSitemapXml, xmlResponse } from '@/utils/sitemap-xml'

export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
  const { authorSlugs } = await getAuthorSlugs()

  const xml = buildSitemapXml(
    authorSlugs.map((item) => ({
      url: `${baseURL}${item.uri}`,
    }))
  )

  return xmlResponse(xml)
}
