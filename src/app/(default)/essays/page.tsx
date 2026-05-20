import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { baseURL } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'

import Hero from './_blocks/hero'
import Archive from './_blocks/archive'

const title = 'All Essays'
const description =
  'Browse the full archive of Founder Notes — essays on product strategy, fundraising, hiring, and the work of building an early-stage company.'

const metadata: PageMetadata = {
  title,
  description,
  slug: 'essays',
  alternates: {
    canonical: '/essays',
  },
  authors: [{ name: 'Founder Notes' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${baseURL}/essays`,
    siteName: 'Founder Notes',
    title,
    description,
    image: {
      url: '/banner.jpg',
      alt: 'Founder Notes — All Essays',
    },
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    image: '/banner.jpg',
  },
  structuredData: buildPageSchema({
    url: `${baseURL}/essays`,
    title,
    description,
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'All Essays', href: '/essays' },
    ],
  }),
}

export const generateMetadata = () => generatePageMetadata(metadata)
export default function Page() {
  return (
    <PageWrapper metadata={metadata}>
      <Hero />
      <Archive />
    </PageWrapper>
  )
}
