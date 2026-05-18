import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { baseURL, defaultDescription } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'

import LogoCard from './_blocks/logo-card'
import Archive from './_blocks/archive'

const title =
  'Douglas Newby | Insights on Architecturally Significant Homes, Neighborhoods & Cities'
const description = defaultDescription

const metadata: PageMetadata = {
  title,
  description,
  keywords: [
    'Douglas Newby',
    'architecturally significant homes',
    'Dallas real estate',
    'Dallas neighborhoods',
    'luxury homes Dallas',
    'Highland Park homes',
    'Preston Hollow homes',
    'estate homes',
    'historic homes',
    'architectural significance',
    'evolution of cities',
    'homes that make us happy',
  ],
  publishDate: '2024-01-01T00:00:00Z',
  modifiedDate: '2025-12-22T00:00:00Z',
  alternates: {
    canonical: '/',
  },
  authors: [{ name: 'Douglas Newby' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${baseURL}/`,
    siteName: 'Douglas Newby',
    title,
    description,
    image: {
      url: '/banner.jpg',
      alt: 'Douglas Newby — Architecturally Significant Homes',
    },
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    image: '/banner.jpg',
  },
  category: 'Real Estate',
  applicationName: 'Douglas Newby',
  structuredData: buildPageSchema({
    url: `${baseURL}/`,
    title,
    description,
    breadcrumbs: [{ name: 'Home', href: '/' }],
  }),
}

export const generateMetadata = () => generatePageMetadata(metadata)
export default function Page() {
  return (
    <PageWrapper metadata={metadata}>
      <LogoCard />
      <Archive />
    </PageWrapper>
  )
}
