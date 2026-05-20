import { getStudioImage } from '@/utils/studio-helpers'
import { socialLinks } from '@/components/footer-3/config'

const socialSameAs = socialLinks
  .map((l) => l.href)
  .filter((href) => href.startsWith('http'))

export const baseURL =
  process.env.NEXT_PUBLIC_PRODUCTION_URL || 'http://localhost:3000'

const logoImageData = getStudioImage('/logo.png', 'large')

export const defaultDescription =
  'Founder Notes is an independent publication on product strategy, fundraising, hiring, and the unglamorous work of building a startup that lasts.'

export const defaultOGImage = {
  url: logoImageData?.url || '',
  width: logoImageData?.width || 0,
  height: logoImageData?.height || 0,
}

export const defaultSEOConfig = {
  creator: 'Founder Notes',
  publisher: 'Founder Notes',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': 30,
      'max-image-preview': 'large' as const,
      'max-snippet': 160,
    },
  },
}

const siteUrl = baseURL

function absoluteUrl(path: string) {
  return path.startsWith('http') ? path : `${siteUrl}${path}`
}

const logoImageUrl = absoluteUrl(logoImageData?.url || '/logo.png')

const logoImageObject = {
  '@type': 'ImageObject',
  '@id': `${siteUrl}/#logo`,
  url: logoImageUrl,
  contentUrl: logoImageUrl,
  width: logoImageData?.width || 0,
  height: logoImageData?.height || 0,
  caption: 'Founder Notes',
  inLanguage: 'en-US',
}

const personImageData = getStudioImage('/headshot.jpg', 'large')
const personImageUrl = absoluteUrl(personImageData?.url || '/headshot.jpg')

const personImageObject = {
  '@type': 'ImageObject',
  '@id': `${siteUrl}/#authorimage`,
  url: personImageUrl,
  contentUrl: personImageUrl,
  ...(personImageData?.width ? { width: personImageData.width } : {}),
  ...(personImageData?.height ? { height: personImageData.height } : {}),
  caption: 'Founder Notes author',
  inLanguage: 'en-US',
}

// Global structured data that appears on every page
export const defaultStructuredData = [
  logoImageObject,
  personImageObject,
  {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'Founder Notes',
    url: siteUrl,
    logo: { '@id': `${siteUrl}/#logo` },
    image: { '@id': `${siteUrl}/#logo` },
    description: defaultDescription,
    sameAs: socialSameAs,
  },
  {
    '@type': 'Person',
    '@id': `${siteUrl}/#author`,
    name: 'Founder Notes',
    url: `${siteUrl}/about`,
    image: { '@id': `${siteUrl}/#authorimage` },
    jobTitle: 'Writer & Operator',
    description:
      'Independent writer and operator covering product strategy, fundraising, hiring, and the day-to-day work of building an early-stage company.',
    worksFor: { '@id': `${siteUrl}/#organization` },
    knowsAbout: [
      'Startup founders',
      'Product strategy',
      'Fundraising',
      'Hiring',
      'Go-to-market',
      'Leadership',
      'Startup operations',
      'Company building',
      'Product-market fit',
    ],
    sameAs: socialSameAs,
  },
  {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: 'Founder Notes',
    description: defaultDescription,
    inLanguage: 'en-US',
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?s={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@type': 'Blog',
    '@id': `${siteUrl}/#blog`,
    name: 'Founder Notes',
    url: siteUrl,
    description: defaultDescription,
    image: { '@id': `${siteUrl}/#logo` },
    inLanguage: 'en-US',
    isPartOf: { '@id': `${siteUrl}/#website` },
    author: { '@id': `${siteUrl}/#author` },
    publisher: { '@id': `${siteUrl}/#organization` },
    about: [
      'Startup Founders',
      'Product Strategy',
      'Fundraising',
      'Hiring & Team',
      'Go-to-Market',
      'Leadership',
    ],
  },
]
