import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'

import Unsubscribe from './_blocks/unsubscribe'

const title = 'Unsubscribe'
const description = 'Stop receiving new essays by email.'

const metadata: PageMetadata = {
  title,
  description,
  slug: 'account/unsubscribe',
  alternates: { canonical: '/account/unsubscribe' },
}

// A reader's own page: not for search engines.
export const generateMetadata = () => ({
  ...generatePageMetadata(metadata),
  robots: { index: false, follow: false },
})

export default function Page() {
  return (
    <PageWrapper metadata={metadata}>
      <Unsubscribe />
    </PageWrapper>
  )
}
