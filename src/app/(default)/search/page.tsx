import type { Metadata } from 'next'
import { Label } from '@/components/label'
import { PageWrapper } from '@/components/page-wrapper'
import { Section } from '@/components/section'
import { type PageMetadata } from '@/utils/page-helpers'
import { SearchResultsClient } from '@/components/search-results-client'

export const generateMetadata = (): Metadata => ({
  title: 'Search',
  robots: { index: false, follow: true },
})

const pageMetadata: PageMetadata = {
  title: 'Search',
  slug: 'search',
}

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
