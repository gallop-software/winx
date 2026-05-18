import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { baseURL } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'

import Hero from './_blocks/hero'
import Archive from './_blocks/archive'

const title = 'All Articles | Douglas Newby'
const description =
  'Browse all articles from Douglas Newby on architecturally significant homes, neighborhoods, and the evolution of cities.'

const metadata: PageMetadata = {
  title,
  description,
  slug: 'all-articles',
  alternates: {
    canonical: '/all-articles',
  },
  authors: [{ name: 'Douglas Newby' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${baseURL}/all-articles`,
    siteName: 'Douglas Newby',
    title,
    description,
    image: {
      url: '/banner.jpg',
      alt: 'Douglas Newby — All Articles',
    },
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    image: '/banner.jpg',
  },
  structuredData: buildPageSchema({
    url: `${baseURL}/all-articles`,
    title,
    description,
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'All Articles', href: '/all-articles' },
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
