import type { Metadata } from 'next'
import {
  baseURL,
  defaultDescription,
  defaultOGImage,
  defaultSEOConfig,
  noIndex,
  siteName,
  twitterHandle,
} from '@/app/metadata'
import { getStudioImage } from '@/utils/studio-helpers'

export interface PageMetadata {
  title?: string
  description?: string
  keywords?: string[]
  slug?: string
  // A path on this site ("/about/") or a whole URL.
  alternates?: { canonical?: string }
  authors?: { name: string; url?: string }[]
  category?: string
  // For a page search engines should leave out or not follow. Left unset, the
  // page is indexed.
  robots?: { index: boolean; follow: boolean }
  openGraph?: {
    type?: 'website' | 'article' | 'profile'
    locale?: string
    url?: string
    title?: string
    description?: string
    image?: {
      url: string
      alt?: string
      width?: number
      height?: number
    }
    // Articles only.
    publishedTime?: string
    modifiedTime?: string
    authors?: string[]
    section?: string
    tags?: string[]
  }
  twitter?: {
    card?: 'summary' | 'summary_large_image'
    title?: string
    description?: string
  }
  structuredData?: object[]
}

function absolute(url: string) {
  return /^https?:\/\//i.test(url) ? url : `${baseURL}${url}`
}

export function generatePageMetadata(
  metadata: PageMetadata,
  slug?: string[]
): Metadata {
  const og = metadata.openGraph
  const ogImageInput = og?.image
  const isExternalUrl = ogImageInput?.url
    ? /^https?:\/\//i.test(ogImageInput.url)
    : false
  // A picture on another host is used as given, sizes included only when
  // known. One of this site's is looked up in Studio.
  const ogImage = ogImageInput
    ? isExternalUrl
      ? {
          url: ogImageInput.url,
          ...(ogImageInput.width ? { width: ogImageInput.width } : {}),
          ...(ogImageInput.height ? { height: ogImageInput.height } : {}),
        }
      : getStudioImage(ogImageInput.url, 'large')
    : null

  const description = metadata.description || defaultDescription
  const canonical = metadata.alternates?.canonical
    ? absolute(metadata.alternates.canonical)
    : undefined
  const url =
    og?.url ||
    canonical ||
    `${baseURL}${slug ? `/${slug.join('/')}` : ''}/`
  const ogTitle = og?.title || metadata.title || siteName
  const ogDescription = og?.description || description
  const isArticle = og?.type === 'article'

  // The dev host is never indexed, whatever the page asks for.
  const robots = noIndex
    ? defaultSEOConfig.robots
    : metadata.robots
      ? {
          ...metadata.robots,
          googleBot: {
            ...metadata.robots,
            'max-video-preview': -1,
            'max-image-preview': 'large' as const,
            'max-snippet': -1,
          },
        }
      : defaultSEOConfig.robots

  return {
    ...(metadata.title ? { title: metadata.title } : {}),
    description,
    keywords: metadata.keywords?.length ? metadata.keywords : undefined,
    // The feed is repeated here: a page's alternates replace the layout's.
    alternates: {
      ...(canonical ? { canonical } : {}),
      types: { 'application/rss+xml': [{ url: '/feed/', title: siteName }] },
    },
    authors: metadata.authors || undefined,
    creator: defaultSEOConfig.creator,
    publisher: defaultSEOConfig.publisher,
    category: metadata.category || undefined,
    referrer: 'origin-when-cross-origin',
    robots,
    openGraph: {
      type: og?.type || 'website',
      locale: og?.locale || 'en_US',
      url,
      siteName,
      title: ogTitle,
      description: ogDescription,
      images: ogImage
        ? [{ ...ogImage, ...(ogImageInput?.alt ? { alt: ogImageInput.alt } : {}) }]
        : [defaultOGImage],
      ...(isArticle
        ? {
            ...(og?.publishedTime ? { publishedTime: og.publishedTime } : {}),
            ...(og?.modifiedTime ? { modifiedTime: og.modifiedTime } : {}),
            ...(og?.authors?.length ? { authors: og.authors } : {}),
            ...(og?.section ? { section: og.section } : {}),
            ...(og?.tags?.length ? { tags: og.tags } : {}),
          }
        : {}),
    },
    // The picture is left out: Next fills it in from Open Graph.
    twitter: {
      card: metadata.twitter?.card || 'summary_large_image',
      site: twitterHandle,
      creator: twitterHandle,
      title: metadata.twitter?.title || ogTitle,
      description: metadata.twitter?.description || ogDescription,
    },
  }
}
