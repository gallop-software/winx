import type { Metadata } from 'next'
import { PageWrapper } from '@/components/page-wrapper'
import { Section } from '@/components/section'
import { type PageMetadata } from '@/utils/page-helpers'
import { SearchResultsClient } from '@/components/search-results-client'

export const generateMetadata = (): Metadata => ({
  title: 'Search Douglas Newby Blog Articles',
  robots: { index: false, follow: true },
})

const pageMetadata: PageMetadata = {
  title: 'Search Douglas Newby Blog Articles',
  slug: 'search',
}

export default function SearchPage() {
  return (
    <PageWrapper metadata={pageMetadata}>
      <Section className="bg-body2 pt-7 pb-20">
        <SearchResultsClient />
      </Section>
    </PageWrapper>
  )
}
