import type { BlogPost } from '@/utils/content-index'
import type { PostData, PostSeoData } from '@/utils/post-cache'
import { decodeEntities, htmlToText } from '@/utils/html-text'
import { replaceProductionUrl } from '@/utils/replace-production-url'
import { gmtToIso, type SchemaAuthor } from '@/utils/structured-data'

// Everything a post's page tells search engines and share cards, worked out
// once for its metadata and its structured data. Each value is the SEO
// plugin's when it has one of its own, then the post's, then the index's.

export interface ResolvedPostSeo {
  // For <title>, where the site's name is added after it.
  title: string
  // The post's own title, for headings and structured data.
  headline: string
  description: string
  // A path on this site, or a whole URL when the post points elsewhere.
  canonical: string
  // Set only when the post is to be kept out of search engines.
  robots?: { index: boolean; follow: boolean }
  shareTitle: string
  shareDescription: string
  image?: { url: string; alt: string; width?: number; height?: number }
  datePublished?: string
  dateModified?: string
  author: SchemaAuthor
  sections: string[]
  tags: string[]
  wordCount: number
}

const DESCRIPTION_LENGTH = 160
const MIN_IMAGE_WIDTH = 100

// A description of a length search engines show whole: plain text, without
// the "[…]" WordPress ends a cut excerpt with, cut at a word.
export function cleanDescription(html: string | undefined | null): string {
  const text = htmlToText(html ?? '')
    .replace(/\s*\[(…|\.\.\.)\]\s*$/, '')
    .trim()
  if (text.length <= DESCRIPTION_LENGTH) return text
  const cut = text.slice(0, DESCRIPTION_LENGTH - 1)
  const atWord = cut.slice(0, Math.max(cut.lastIndexOf(' '), 80))
  return `${atWord.replace(/[\s,;:.–—-]+$/, '')}…`
}

function text(value: unknown): string {
  return typeof value === 'string' ? decodeEntities(value).trim() : ''
}

// The SEO plugin's title for a page ends with the WordPress site's own name
// ("About - Founder Notes"); this site adds its name itself, so that one
// comes off.
function withoutSiteName(title: string, siteName: string | undefined): string {
  const name = text(siteName)
  if (!title || !name) return title
  const match = title.match(/^(.*?)\s*[-–—|·]\s*(.*)$/)
  return match && match[2] === name ? match[1]!.trim() : title
}

// The plugin has sent its robots settings as true, 1 and "noindex" in
// different versions.
function isSet(value: unknown, word: string): boolean {
  return value === true || value === 1 || value === '1' || value === word
}

// The plugin's address for the post is on the WordPress host: the same page
// here, unless someone pointed the post at another address altogether.
function canonicalOf(seo: PostSeoData | undefined, path: string): string {
  const given = text(seo?.canonical)
  if (!given) return path
  const url = replaceProductionUrl(given)
  return url.includes('?') || url.endsWith('/') ? url : `${url}/`
}

function imageOf(
  post: PostData['post'],
  seo: PostSeoData | undefined,
  entry: BlogPost | null,
  alt: string
): ResolvedPostSeo['image'] {
  const shared = seo?.opengraphImage
  const featured = post.featuredImage
  const featuredUrl: string =
    featured?.sourceUrl || entry?.metadata.featuredImage || ''
  const featuredWidth =
    Number(featured?.width) || entry?.metadata.featuredImageWidth
  const featuredHeight =
    Number(featured?.height) || entry?.metadata.featuredImageHeight
  const featuredAlt = text(featured?.altText) || alt

  // The plugin's picture is the featured image unless one was chosen for
  // sharing, and it comes with its own size.
  if (shared?.mediaItemUrl) {
    const width = Number(shared.mediaDetails?.width)
    const height = Number(shared.mediaDetails?.height)
    return {
      url: shared.mediaItemUrl,
      alt: shared.mediaItemUrl === featuredUrl ? featuredAlt : alt,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    }
  }

  // A few old posts have a spacer a few pixels wide as their featured image.
  if (!featuredUrl) return undefined
  if (featuredWidth && featuredWidth < MIN_IMAGE_WIDTH) return undefined
  return {
    url: featuredUrl,
    alt: featuredAlt,
    ...(featuredWidth ? { width: featuredWidth } : {}),
    ...(featuredHeight ? { height: featuredHeight } : {}),
  }
}

export function resolvePostSeo(
  data: PostData,
  entry: BlogPost | null,
  path: string
): ResolvedPostSeo {
  const { post, seo, site } = data
  // A title is shown as text, so any markup WordPress lets into it is dropped.
  const headline =
    (typeof post.postTitle === 'string' ? htmlToText(post.postTitle) : '') ||
    entry?.metadata.title ||
    ''
  const title =
    withoutSiteName(text(seo?.title), site?.siteTitle) ||
    entry?.metadata.seoTitle ||
    headline

  const description =
    text(seo?.metaDesc) ||
    entry?.metadata.seoDescription ||
    cleanDescription(post.postExcerpt) ||
    cleanDescription(post.excerpt) ||
    cleanDescription(entry?.metadata.description)

  // The plugin's own robots setting reaches the index through Sync. Gallop
  // 1.3.1 sends null for it here whatever it is set to, so the index decides.
  const noindex =
    isSet(seo?.metaRobotsNoindex, 'noindex') || entry?.metadata.noindex === true
  const nofollow = isSet(seo?.metaRobotsNoFollow, 'nofollow')

  const authorName =
    text(post.author?.name) ||
    entry?.metadata.author ||
    text(site?.author?.displayName)
  const authorSlug = entry?.metadata.authorSlug
  const authorUrl = text(post.author?.url) || text(site?.author?.userUrl)
  const authorBio = htmlToText(site?.author?.description ?? '')

  const sections = entry?.metadata.categories?.length
    ? entry.metadata.categories
    : Array.isArray(post.categories)
      ? post.categories.map((c: { name?: unknown }) => text(c?.name))
      : []

  const body = htmlToText(String(post.postContent ?? ''))
  const image = imageOf(post, seo, entry, headline)

  const datePublished =
    gmtToIso(post.postDateGmt) || gmtToIso(entry?.metadata.dateGmt)
  const dateModified =
    gmtToIso(post.postModifiedGmt) || gmtToIso(entry?.metadata.modifiedGmt)

  return {
    title,
    headline,
    description,
    canonical: canonicalOf(seo, path),
    ...(noindex || nofollow
      ? { robots: { index: !noindex, follow: !nofollow } }
      : {}),
    shareTitle: text(seo?.opengraphTitle) || title,
    // The plugin fills this with the excerpt, cut short by WordPress, when
    // nobody wrote one for sharing.
    shareDescription:
      cleanDescription(seo?.opengraphDescription) || description,
    ...(image ? { image } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    author: {
      name: authorName,
      ...(authorSlug ? { slug: authorSlug } : {}),
      ...(authorBio ? { description: authorBio } : {}),
      ...(text(post.author?.avatar)
        ? { avatar: text(post.author?.avatar) }
        : {}),
      ...(authorUrl ? { url: authorUrl } : {}),
    },
    sections: sections.filter(Boolean),
    tags: entry?.metadata.tags ?? [],
    wordCount: body ? body.split(/\s+/).length : 0,
  }
}
