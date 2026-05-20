import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { baseURL } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'

import Hero from './_blocks/hero'
import ContactForm from './_blocks/contact-form'
import Testimonial from './_blocks/testimonial'

const title = 'Contact'
const description =
  'Get in touch with Founder Notes. Questions, feedback, or story ideas — send us a message and we will get back to you.'

const metadata: PageMetadata = {
  title,
  description,
  slug: 'contact',
  alternates: {
    canonical: '/contact',
  },
  authors: [{ name: 'Founder Notes' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${baseURL}/contact`,
    siteName: 'Founder Notes',
    title,
    description,
    image: {
      url: '/banner.jpg',
      alt: 'Contact Founder Notes',
    },
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    image: '/banner.jpg',
  },
  structuredData: buildPageSchema({
    url: `${baseURL}/contact`,
    title,
    description,
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'Contact', href: '/contact' },
    ],
  }),
}

export const generateMetadata = () => generatePageMetadata(metadata)
export default function Page() {
  return (
    <PageWrapper metadata={metadata}>
      <Hero />
      <ContactForm />
      <Testimonial />
    </PageWrapper>
  )
}
