import { getStudioImage } from '@/utils/studio-helpers'
import {
  editorBio,
  editorImage,
  editorName,
  publisher,
  socialLinks,
} from '@/components/footer/config'

const socialSameAs = socialLinks
  .map((l) => l.href)
  .filter((href) => href.startsWith('http'))

export const baseURL =
  process.env.NEXT_PUBLIC_PRODUCTION_URL || 'http://localhost:3000'

// A dev host carries the same posts as the live site, so it is kept out of
// search engines. Turns itself off once the production URL is the real domain.
export const noIndex = new URL(baseURL).hostname.startsWith('dev.')

// The site's name, as it ends every title and labels every share card.
export const siteName = 'Founder Notes'

export const siteTagline = 'Essays on product, fundraising, hiring, and building a startup'

export const defaultDescription =
  'Founder Notes is an independent publication on product strategy, fundraising, hiring, and the unglamorous work of building a startup that lasts.'

export const twitterHandle = '@winx'

const logoImageData = getStudioImage('/logo.png', 'large')

// The picture a link preview shows when a page has none of its own.
const shareImageData = getStudioImage('/logo.png', 'large')

export const defaultOGImage = {
  url: shareImageData?.url || '',
  width: shareImageData?.width || 0,
  height: shareImageData?.height || 0,
}

// What search engines may do with a page that is meant to be found. A page
// that is not passes its own to generatePageMetadata.
export const indexRobots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large' as const,
    'max-snippet': -1,
  },
}

export const defaultSEOConfig = {
  creator: editorName,
  publisher,
  robots: noIndex ? { index: false, follow: false } : indexRobots,
}

const siteUrl = baseURL

function absoluteUrl(path: string) {
  return path.startsWith('http') ? path : `${siteUrl}${path}`
}

// The ids other nodes point at. Every page's structured data carries the
// nodes below, so a page only ever refers to them.
export const schemaIds = {
  website: `${siteUrl}/#website`,
  organization: `${siteUrl}/#organization`,
  author: `${siteUrl}/#author`,
  blog: `${siteUrl}/#blog`,
  logo: `${siteUrl}/#logo`,
}

const logoImageUrl = absoluteUrl(logoImageData?.url || '/logo.png')

const logoImageObject = {
  '@type': 'ImageObject',
  '@id': schemaIds.logo,
  url: logoImageUrl,
  contentUrl: logoImageUrl,
  ...(logoImageData
    ? { width: logoImageData.width, height: logoImageData.height }
    : {}),
  caption: siteName,
  inLanguage: 'en-US',
}

const personImageData = getStudioImage(editorImage.src, 'large')

const personImageObject = personImageData
  ? {
      '@type': 'ImageObject',
      '@id': `${siteUrl}/#authorimage`,
      url: absoluteUrl(personImageData.url),
      contentUrl: absoluteUrl(personImageData.url),
      width: personImageData.width,
      height: personImageData.height,
      caption: editorName,
      inLanguage: 'en-US',
    }
  : null

const topics = [
  'Startup founders',
  'Product strategy',
  'Fundraising',
  'Hiring',
  'Go-to-market',
  'Leadership',
]

// Global structured data that appears on every page
export const defaultStructuredData = [
  logoImageObject,
  ...(personImageObject ? [personImageObject] : []),
  {
    '@type': 'Organization',
    '@id': schemaIds.organization,
    name: publisher,
    url: `${siteUrl}/`,
    logo: { '@id': schemaIds.logo },
    image: { '@id': schemaIds.logo },
  },
  {
    '@type': 'Person',
    '@id': schemaIds.author,
    name: editorName,
    url: `${siteUrl}/about/`,
    ...(personImageObject
      ? { image: { '@id': `${siteUrl}/#authorimage` } }
      : {}),
    jobTitle: 'Writer & Operator',
    description: editorBio,
    knowsAbout: topics,
    sameAs: socialSameAs,
  },
  {
    '@type': 'WebSite',
    '@id': schemaIds.website,
    url: `${siteUrl}/`,
    name: siteName,
    description: siteTagline,
    inLanguage: 'en-US',
    publisher: { '@id': schemaIds.organization },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search/?s={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@type': 'Blog',
    '@id': schemaIds.blog,
    name: siteName,
    url: `${siteUrl}/`,
    description: defaultDescription,
    image: { '@id': schemaIds.logo },
    inLanguage: 'en-US',
    isPartOf: { '@id': schemaIds.website },
    author: { '@id': schemaIds.author },
    publisher: { '@id': schemaIds.organization },
    about: topics,
  },
]
