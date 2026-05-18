import { getStudioImage } from '@/utils/studio-helpers'
import { socialLinks } from '@/components/footer-3/config'

const socialSameAs = socialLinks
  .map((l) => l.href)
  .filter((href) => href.startsWith('http'))

export const baseURL =
  process.env.NEXT_PUBLIC_PRODUCTION_URL || 'http://localhost:3000'

const logoImageData = getStudioImage('/logo-dn-in-2.png', 'large')

export const defaultDescription =
  'Douglas Newby insights on architecturally significant homes, neighborhoods, and the evolution of cities — with a focus on Dallas and the homes that make us happy.'

export const defaultOGImage = {
  url: logoImageData?.url || '',
  width: logoImageData?.width || 0,
  height: logoImageData?.height || 0,
}

export const defaultSEOConfig = {
  creator: 'Douglas Newby',
  publisher: 'Douglas Newby',
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
const realEstateUrl =
  process.env.NEXT_PUBLIC_MAIN_URL || 'https://dougnewby.com'

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

const businessAddress = {
  '@type': 'PostalAddress',
  streetAddress: '4514 Cole Avenue Suite 600',
  addressLocality: 'Dallas',
  addressRegion: 'TX',
  postalCode: '75205',
  addressCountry: 'US',
}

// Global structured data that appears on every page
export const defaultStructuredData = [
  logoImageObject,
  personImageObject,
  {
    '@type': 'Person',
    '@id': `${siteUrl}/#person`,
    name: 'Douglas Newby',
    url: `${siteUrl}/author/dougnewby/`,
    image: { '@id': `${siteUrl}/#personimage` },
    jobTitle: 'Realtor',
    description:
      'National award-winning realtor who identifies architectural significance, value, and homes that make people happy. Writes on architecturally significant homes, neighborhoods, and the evolution of cities, with a focus on Dallas.',
    worksFor: { '@id': `${siteUrl}/#business` },
    knowsAbout: [
      'Architecturally significant homes',
      'Luxury real estate',
      'Dallas neighborhoods',
      'Highland Park',
      'Preston Hollow',
      'Architectural history',
      'Urban evolution',
      'Estate homes',
      'Historic preservation',
    ],
    sameAs: [realEstateUrl, ...socialSameAs],
  },
  {
    '@type': 'RealEstateAgent',
    '@id': `${siteUrl}/#business`,
    name: 'Douglas Newby & Associates',
    url: realEstateUrl,
    telephone: '(214) 522-1000',
    image: { '@id': `${siteUrl}/#logo` },
    logo: { '@id': `${siteUrl}/#logo` },
    address: businessAddress,
    areaServed: { '@type': 'City', name: 'Dallas' },
    founder: { '@id': `${siteUrl}/#person` },
    sameAs: [realEstateUrl, ...socialSameAs],
  },
  {
    '@type': 'Blog',
    '@id': `${siteUrl}/#blog`,
    name: 'Douglas Newby Blog',
    url: siteUrl,
    description:
      'Insights on architecturally significant homes, neighborhoods, and the evolution of cities — with a focus on Dallas and the homes that make us happy.',
    image: { '@id': `${siteUrl}/#logo` },
    inLanguage: 'en-US',
    author: { '@id': `${siteUrl}/#person` },
    publisher: { '@id': `${siteUrl}/#person` },
    about: [
      'Architecturally Significant Homes',
      'Dallas Neighborhoods',
      'Evolution of Cities',
      'Luxury Real Estate',
    ],
  },
]
