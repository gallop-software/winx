import { baseURL, schemaIds } from '@/app/metadata'
import { editorName } from '@/components/footer/config'

// The structured data a page adds to the site-wide nodes in
// src/app/metadata.tsx. Every URL and @id is on this site's own address, with
// the trailing slash its pages are served at.

export type SchemaPageType =
  | 'WebPage'
  | 'CollectionPage'
  | 'ProfilePage'
  | 'AboutPage'
  | 'ContactPage'
  | 'SearchResultsPage'

export interface SchemaImage {
  url: string
  width?: number
  height?: number
  caption?: string
}

export interface SchemaAuthor {
  name: string
  slug?: string
  description?: string
  avatar?: string
  url?: string
}

interface BuildPageSchemaArgs {
  // A path on this site ("/about/") or a whole URL.
  url: string
  title: string
  description?: string
  type?: SchemaPageType
  breadcrumbs?: { name: string; href?: string }[]
  image?: SchemaImage | null
  datePublished?: string
  dateModified?: string
  // The @id of what the page is about: its article, its person, the blog.
  mainEntity?: string
  // The posts a listing page shows, in order.
  posts?: { url: string; title: string }[]
  schemaList?: object[]
}

// A whole URL on this site, ending in a slash unless it carries a query.
export function schemaUrl(url: string): string {
  const full = /^https?:\/\//i.test(url)
    ? url
    : `${baseURL}${url.startsWith('/') ? '' : '/'}${url}`
  if (full.includes('?') || full.includes('#') || full.endsWith('/')) {
    return full
  }
  return `${full}/`
}

// WordPress's GMT time ("2026-08-08 18:54:03", or with a T) as ISO 8601.
// Its local time must not be used: it carries no offset.
export function gmtToIso(gmt?: string | null): string | undefined {
  if (!gmt) return undefined
  const match = gmt.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/)
  if (!match || match[1] === '0000-00-00') return undefined
  return `${match[1]}T${match[2]}+00:00`
}

export function buildPageSchema({
  url,
  title,
  description,
  type = 'WebPage',
  breadcrumbs,
  image,
  datePublished,
  dateModified,
  mainEntity,
  posts,
  schemaList,
}: BuildPageSchemaArgs): object[] {
  const pageUrl = schemaUrl(url)
  const imageId = image?.url ? `${pageUrl}#primaryimage` : null
  const breadcrumbId = breadcrumbs?.length ? `${pageUrl}#breadcrumb` : null
  const listId = posts?.length ? `${pageUrl}#posts` : null

  const graph: object[] = [
    {
      '@type': type,
      '@id': pageUrl,
      url: pageUrl,
      name: title,
      ...(description ? { description } : {}),
      isPartOf: { '@id': schemaIds.website },
      inLanguage: 'en-US',
      ...(imageId
        ? {
            primaryImageOfPage: { '@id': imageId },
            image: { '@id': imageId },
            thumbnailUrl: image?.url,
          }
        : {}),
      ...(datePublished ? { datePublished } : {}),
      ...(dateModified ? { dateModified } : {}),
      ...(breadcrumbId ? { breadcrumb: { '@id': breadcrumbId } } : {}),
      ...(mainEntity || listId
        ? { mainEntity: { '@id': mainEntity || listId } }
        : {}),
    },
  ]

  if (image?.url && imageId) {
    graph.push({
      '@type': 'ImageObject',
      '@id': imageId,
      inLanguage: 'en-US',
      url: image.url,
      contentUrl: image.url,
      ...(image.width ? { width: image.width } : {}),
      ...(image.height ? { height: image.height } : {}),
      ...(image.caption ? { caption: image.caption } : {}),
    })
  }

  if (breadcrumbs?.length && breadcrumbId) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: breadcrumbs.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        ...(b.href ? { item: schemaUrl(b.href) } : {}),
      })),
    })
  }

  if (posts?.length && listId) {
    graph.push({
      '@type': 'ItemList',
      '@id': listId,
      numberOfItems: posts.length,
      itemListElement: posts.map((post, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: schemaUrl(post.url),
        name: post.title,
      })),
    })
  }

  if (schemaList?.length) graph.push(...schemaList)

  return graph
}

// The @id of an author's Person node. The site's own author is the node every
// page already carries; anyone else gets one on their author page's address.
export function authorSchemaId(author: SchemaAuthor): string {
  if (author.name === editorName || !author.slug) return schemaIds.author
  return `${schemaUrl(`/author/${author.slug}/`)}#person`
}

// A Person node for an author other than the site's own, whose node is
// site-wide. Null for the site's own author.
export function buildAuthorSchema(author: SchemaAuthor): object | null {
  const id = authorSchemaId(author)
  if (id === schemaIds.author) return null
  return {
    '@type': 'Person',
    '@id': id,
    name: author.name,
    ...(author.slug ? { url: schemaUrl(`/author/${author.slug}/`) } : {}),
    ...(author.description ? { description: author.description } : {}),
    ...(author.avatar ? { image: author.avatar } : {}),
    ...(author.url ? { sameAs: [author.url] } : {}),
  }
}

interface BuildArticleSchemaArgs {
  url: string
  headline: string
  description?: string
  hasImage?: boolean
  datePublished?: string
  dateModified?: string
  author: SchemaAuthor
  sections?: string[]
  tags?: string[]
  wordCount?: number
  commentCount?: number
}

// The one BlogPosting of a post's page, and its author's Person node when
// that is not the site's own. Goes in buildPageSchema's schemaList, with
// articleSchemaId as the page's mainEntity.
export function articleSchemaId(url: string): string {
  return `${schemaUrl(url)}#article`
}

export function buildArticleSchema({
  url,
  headline,
  description,
  hasImage,
  datePublished,
  dateModified,
  author,
  sections,
  tags,
  wordCount,
  commentCount,
}: BuildArticleSchemaArgs): object[] {
  const pageUrl = schemaUrl(url)
  const person = buildAuthorSchema(author)
  const article = {
    '@type': 'BlogPosting',
    '@id': articleSchemaId(url),
    isPartOf: { '@id': schemaIds.blog },
    mainEntityOfPage: { '@id': pageUrl },
    url: pageUrl,
    headline,
    name: headline,
    ...(description ? { description } : {}),
    inLanguage: 'en-US',
    ...(hasImage ? { image: { '@id': `${pageUrl}#primaryimage` } } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified || datePublished
      ? { dateModified: dateModified || datePublished }
      : {}),
    author: { '@id': authorSchemaId(author) },
    publisher: { '@id': schemaIds.organization },
    ...(sections?.length ? { articleSection: sections } : {}),
    ...(tags?.length ? { keywords: tags.join(', ') } : {}),
    ...(wordCount ? { wordCount } : {}),
    ...(typeof commentCount === 'number' ? { commentCount } : {}),
  }
  return person ? [article, person] : [article]
}
