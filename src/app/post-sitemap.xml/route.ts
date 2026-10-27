import { baseURL } from '@/app/metadata'
import { getSitemapPosts } from '@/utils/content-index'
import { buildSitemapXml, sitemapDate, xmlResponse } from '@/utils/sitemap-xml'

// Built on each request from the content index, so a post is listed as soon
// as it has been synced.
export const dynamic = 'force-dynamic'

export async function GET() {
  const posts = await getSitemapPosts()

  const xml = buildSitemapXml(
    posts.map((post) => {
      const lastmod = sitemapDate(post.modified)
      return {
        url: `${baseURL}${post.url}`,
        ...(lastmod ? { lastmod } : {}),
      }
    })
  )

  return xmlResponse(xml)
}
