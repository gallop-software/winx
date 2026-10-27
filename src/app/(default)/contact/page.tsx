import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { buildPageSchema } from '@/utils/structured-data'

import Hero from './_blocks/hero'
import ContactForm from './_blocks/contact-form'
import Testimonial from './_blocks/testimonial'

const title = 'Contact'
const description =
  'Get in touch with Founder Notes. Questions, comments, or corrections: send a message.'

const metadata: PageMetadata = {
  title,
  description,
  alternates: { canonical: '/contact/' },
  structuredData: buildPageSchema({
    url: '/contact/',
    title,
    description,
    type: 'ContactPage',
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'Contact', href: '/contact/' },
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
