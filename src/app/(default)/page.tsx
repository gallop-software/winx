import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { baseURL, defaultDescription } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'

import LogoCard from './_blocks/logo-card'
import Archive from './_blocks/archive'

const title = 'Essays on Product, Fundraising & Building a Startup'
const description = defaultDescription

const metadata: PageMetadata = {
  title,
  description,
  keywords: [
    'startup founders',
    'founder essays',
    'product strategy',
    'fundraising',
    'hiring',
    'go-to-market',
    'leadership',
    'startup operations',
    'product-market fit',
    'company building',
    'early-stage startup',
    'founder newsletter',
  ],
  publishDate: '2024-01-01T00:00:00Z',
  modifiedDate: '2025-12-22T00:00:00Z',
  alternates: {
    canonical: '/',
  },
  authors: [{ name: 'Founder Notes' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${baseURL}/`,
    siteName: 'Founder Notes',
    title,
    description,
    image: {
      url: '/banner.jpg',
      alt: 'Founder Notes — Essays on Building Companies That Matter',
    },
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    image: '/banner.jpg',
  },
  category: 'Startups',
  applicationName: 'Founder Notes',
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
