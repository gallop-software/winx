import { baseURL } from '@/app/metadata'
import { replaceProductionUrl } from '@/utils/replace-production-url'

interface WPSeoImage {
  mediaItemUrl?: string
  mediaDetails?: {
    width?: number
    height?: number
    sizes?: { sourceUrl?: string }[]
  }
}

interface WPSeo {
  title?: string
  metaDesc?: string
  opengraphUrl?: string
  opengraphTitle?: string
  opengraphDescription?: string
  opengraphImage?: WPSeoImage | null
  opengraphPublishedTime?: string
  opengraphModifiedTime?: string
}

interface WPPost {
  postDate?: string
  postModified?: string
}

interface BuildPageSchemaArgs {
  url: string
  title: string
  description?: string
  seo?: WPSeo | null
  post?: WPPost | null
  breadcrumbs?: { name: string; href?: string }[]
  schemaList?: object[]
}

function normalizeUrl(url?: string) {
  if (!url) return baseURL
  if (url.startsWith('http')) return replaceProductionUrl(url)
  return `${baseURL}${url.startsWith('/') ? '' : '/'}${url}`
}

function toIso(date?: string) {
  if (!date) return undefined
  return new Date(date).toISOString().replace('.000Z', '+00:00')
}

export function buildPageSchema({
  url,
  title,
  description,
  seo,
  post,
  breadcrumbs,
  schemaList,
}: BuildPageSchemaArgs): object[] {
  const fullUrl = normalizeUrl(seo?.opengraphUrl || url)
  const image = seo?.opengraphImage
  const imageUrl = image?.mediaItemUrl || null
  const thumbnailUrl =
    image?.mediaDetails?.sizes?.[0]?.sourceUrl || imageUrl
  const primaryImageId = imageUrl ? `${baseURL}/#primaryimage` : null

  const datePublished = seo?.opengraphPublishedTime || toIso(post?.postDate)
  const dateModified = seo?.opengraphModifiedTime || toIso(post?.postModified)

  const isPost = Boolean(datePublished)
  const webPage: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': fullUrl,
    url: fullUrl,
    name: seo?.title || title,
    isPartOf: { '@id': `${baseURL}/#website` },
    inLanguage: 'en-US',
    ...(primaryImageId
      ? {
          primaryImageOfPage: { '@id': primaryImageId },
          image: { '@id': primaryImageId },
          thumbnailUrl,
        }
      : {}),
    description: seo?.opengraphDescription || seo?.metaDesc || description,
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...(breadcrumbs?.length
      ? { breadcrumb: { '@id': `${fullUrl}/#breadcrumb` } }
      : {}),
  }

  const graph: object[] = [webPage]

  if (isPost) {
    graph.push({
      '@type': 'BlogPosting',
      '@id': `${fullUrl}/#article`,
      isPartOf: { '@id': fullUrl },
      mainEntityOfPage: { '@id': fullUrl },
      headline: seo?.title || title,
      description: seo?.opengraphDescription || seo?.metaDesc || description,
      inLanguage: 'en-US',
      url: fullUrl,
      ...(primaryImageId ? { image: { '@id': primaryImageId } } : {}),
      ...(datePublished ? { datePublished } : {}),
      ...(dateModified ? { dateModified } : {}),
      author: { '@id': `${baseURL}/#author` },
      publisher: { '@id': `${baseURL}/#organization` },
    })
  }

  if (imageUrl && primaryImageId) {
    graph.push({
      '@type': 'ImageObject',
      '@id': primaryImageId,
      inLanguage: 'en-US',
      url: imageUrl,
      contentUrl: imageUrl,
      ...(image?.mediaDetails?.width
        ? { width: image.mediaDetails.width }
        : {}),
      ...(image?.mediaDetails?.height
        ? { height: image.mediaDetails.height }
        : {}),
    })
  }

  if (breadcrumbs && breadcrumbs.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${fullUrl}/#breadcrumb`,
      itemListElement: breadcrumbs.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        ...(b.href ? { item: normalizeUrl(b.href) } : {}),
      })),
    })
  }

  if (schemaList && schemaList.length) {
    graph.push(...schemaList)
  }

  return graph
}
