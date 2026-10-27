import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'

import Confirm from './_blocks/confirm'

const title = 'Confirm your subscription'
const description = 'Confirm that you would like new essays by email.'

const metadata: PageMetadata = {
  title,
  description,
  slug: 'newsletter/confirm',
  alternates: { canonical: '/newsletter/confirm' },
}

// A reader's own link: not for search engines.
export const generateMetadata = () => ({
  ...generatePageMetadata(metadata),
  robots: { index: false, follow: false },
})

export default function Page() {
  return (
    <PageWrapper metadata={metadata}>
      <Confirm />
    </PageWrapper>
  )
}
