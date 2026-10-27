import { Label } from '@/components/label'
import { PageWrapper } from '@/components/page-wrapper'
import { Section } from '@/components/section'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { buildPageSchema } from '@/utils/structured-data'
import { SearchResultsClient } from '@/components/search-results-client'

const title = 'Search'
const description =
  'Search every essay on Founder Notes: product strategy, fundraising, hiring, and building a startup.'

// Search results are no page of their own: search engines follow the links
// on them but list none of them.
const pageMetadata: PageMetadata = {
  title,
  description,
  alternates: { canonical: '/search/' },
  robots: { index: false, follow: true },
  structuredData: buildPageSchema({
    url: '/search/',
    title,
    description,
    type: 'SearchResultsPage',
  }),
}

export const generateMetadata = () => generatePageMetadata(pageMetadata)

export default function SearchPage() {
  return (
    <PageWrapper metadata={pageMetadata}>
      <Section className="bg-body pt-7">
        <Label margin="mb-2">Archive</Label>
        <SearchResultsClient />
      </Section>
    </PageWrapper>
  )
}
