import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { baseURL } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'

import Hero from './_blocks/hero'
import Body from './_blocks/body'

const title = 'About'
const description =
  'Founder Notes is an independent publication for people building companies — essays on product strategy, fundraising, hiring, and the day-to-day work of running an early-stage startup.'

const metadata: PageMetadata = {
  title,
  description,
  slug: 'about',
  alternates: {
    canonical: '/about',
  },
  authors: [{ name: 'Founder Notes' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${baseURL}/about`,
    siteName: 'Founder Notes',
    title,
    description,
    image: {
      url: '/banner.jpg',
      alt: 'About Founder Notes',
    },
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    image: '/banner.jpg',
  },
  structuredData: buildPageSchema({
    url: `${baseURL}/about`,
    title,
    description,
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'About', href: '/about' },
    ],
  }),
}

export const generateMetadata = () => generatePageMetadata(metadata)
export default function Page() {
  return (
    <PageWrapper metadata={metadata}>
      <Hero />
      <Body />
    </PageWrapper>
  )
}
