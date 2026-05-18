import { getStudioImage } from '@/utils/studio-helpers'
import { socialLinks } from '@/components/footer-3/config'

const socialSameAs = socialLinks
  .map((l) => l.href)
  .filter((href) => href.startsWith('http'))

export const baseURL =
  process.env.NEXT_PUBLIC_PRODUCTION_URL || 'http://localhost:3000'

const logoImageData = getStudioImage('/webplantmedia-logo.png', 'large')

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
const mainUrl = process.env.NEXT_PUBLIC_MAIN_URL || siteUrl

const logoImageUrl = logoImageData?.url
  ? logoImageData.url.startsWith('http')
    ? logoImageData.url
    : `${siteUrl}${logoImageData.url}`
  : ''

const logoImageObject = {
  '@type': 'ImageObject',
  '@id': `${siteUrl}/#logo`,
  url: logoImageUrl,
  contentUrl: logoImageUrl,
  width: logoImageData?.width || 0,
  height: logoImageData?.height || 0,
}

const personImageData = getStudioImage('/dougpicture-198.jpg', 'large')
const personImageUrlPath = personImageData?.url || '/dougpicture-198.jpg'
const personImageUrl = personImageUrlPath.startsWith('http')
  ? personImageUrlPath
  : `${siteUrl}${personImageUrlPath}`

const personImageObject = {
  '@type': 'ImageObject',
  '@id': `${siteUrl}/#personimage`,
  url: personImageUrl,
  contentUrl: personImageUrl,
  ...(personImageData?.width ? { width: personImageData.width } : {}),
  ...(personImageData?.height ? { height: personImageData.height } : {}),
}

// Global structured data that appears on every page
export const defaultStructuredData = [
  logoImageObject,
  personImageObject,
  {
    '@type': 'Person',
    '@id': `${siteUrl}/#person`,
    name: 'Founder Notes',
    url: `${siteUrl}/`,
    image: { '@id': `${siteUrl}/#personimage` },
    jobTitle: 'Writer & Operator',
    description:
      'Independent writer and operator covering product strategy, fundraising, hiring, and the day-to-day work of building an early-stage company.',
    worksFor: { '@id': `${siteUrl}/#business` },
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
    sameAs: [mainUrl, ...socialSameAs],
  },
  {
    '@type': 'Organization',
    '@id': `${siteUrl}/#business`,
    name: 'Founder Notes',
    url: mainUrl,
    image: { '@id': `${siteUrl}/#logo` },
    logo: { '@id': `${siteUrl}/#logo` },
    founder: { '@id': `${siteUrl}/#person` },
    sameAs: [mainUrl, ...socialSameAs],
  },
  {
    '@type': 'Blog',
    '@id': `${siteUrl}/#blog`,
    name: 'Founder Notes',
    url: siteUrl,
    description:
      'Essays on building companies that matter — product strategy, fundraising, hiring, and the unglamorous work of building a startup that lasts.',
    image: { '@id': `${siteUrl}/#logo` },
    inLanguage: 'en-US',
    author: { '@id': `${siteUrl}/#person` },
    publisher: { '@id': `${siteUrl}/#person` },
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
