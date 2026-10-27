import { DateTime } from 'luxon'
import {
  baseURL,
  defaultDescription,
  siteName,
} from '@/app/metadata'
import { filterPosts } from '@/utils/filter-posts'
import { cleanDescription } from '@/utils/post-seo'

// The newest posts as RSS, for feed readers. Built on each request from the
// content index, so a post is in the feed as soon as it has been synced.
export const dynamic = 'force-dynamic'

const FEED_POSTS = 20

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// WordPress's GMT time as the date RSS takes.
function rssDate(gmt: string | undefined): string | null {
  if (!gmt) return null
  const date = DateTime.fromISO(gmt.replace(' ', 'T'), { zone: 'utc' })
  return date.isValid ? date.toRFC2822() : null
}

export async function GET() {
  const { posts } = await filterPosts({ page: 1, perPage: FEED_POSTS })
  const feedUrl = `${baseURL}/feed/`
  const updated = rssDate(posts[0]?.metadata.modifiedGmt)

  const items = posts
    .filter((post) => !post.metadata.noindex)
    .map((post) => {
      const url = `${baseURL}${post.url}/`
      const published = rssDate(post.metadata.dateGmt)
      const description =
        post.metadata.seoDescription ||
        cleanDescription(post.metadata.description)
      return [
        '    <item>',
        `      <title>${escapeXml(post.metadata.title ?? '')}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        ...(published ? [`      <pubDate>${published}</pubDate>`] : []),
        ...(post.metadata.author
          ? [`      <dc:creator>${escapeXml(post.metadata.author)}</dc:creator>`]
          : []),
        ...(post.metadata.categories ?? []).map(
          (name) => `      <category>${escapeXml(name)}</category>`
        ),
        `      <description>${escapeXml(description)}</description>`,
        '    </item>',
      ].join('\n')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(`${baseURL}/`)}</link>
    <description>${escapeXml(defaultDescription)}</description>
    <language>en-US</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${updated ? `    <lastBuildDate>${updated}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  })
}
