import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { schemaIds } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'

import Hero from './_blocks/hero'
import Pages from './_blocks/pages'
import Archive from './_blocks/archive'

const title = 'All Essays'
const description =
  'Browse the full archive of Founder Notes — essays on product strategy, fundraising, hiring, and the work of building an early-stage company, by month and by category.'

const metadata: PageMetadata = {
  title,
  description,
  alternates: { canonical: '/essays/' },
  structuredData: buildPageSchema({
    url: '/essays/',
    title,
    description,
    type: 'CollectionPage',
    mainEntity: schemaIds.blog,
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'All Essays', href: '/essays/' },
    ],
  }),
}

// Rendered on each visit from the content index, so a post shows here as soon
// as it has been synced.
export const dynamic = 'force-dynamic'

export const generateMetadata = () => generatePageMetadata(metadata)
export default function Page() {
  return (
    <PageWrapper metadata={metadata}>
      <Hero />
      <Pages />
      <Archive />
    </PageWrapper>
  )
}
