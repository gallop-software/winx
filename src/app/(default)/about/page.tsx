import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { schemaIds } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'

import Hero from './_blocks/hero'
import Body from './_blocks/body'

const title = 'About'
const description =
  'Founder Notes is an independent publication for people building companies — essays on product strategy, fundraising, hiring, and the day-to-day work of running an early-stage startup.'

const metadata: PageMetadata = {
  title,
  description,
  alternates: { canonical: '/about/' },
  structuredData: buildPageSchema({
    url: '/about/',
    title,
    description,
    type: 'AboutPage',
    mainEntity: schemaIds.author,
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'About', href: '/about/' },
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
