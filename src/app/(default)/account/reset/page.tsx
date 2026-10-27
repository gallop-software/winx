import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'

import Reset from './_blocks/reset'

const title = 'Choose a new password'
const description = 'Choose a new password for your account.'

const metadata: PageMetadata = {
  title,
  description,
  slug: 'account/reset',
  alternates: { canonical: '/account/reset' },
}

// A member's own page: not for search engines.
export const generateMetadata = () => ({
  ...generatePageMetadata(metadata),
  robots: { index: false, follow: false },
})

export default function Page() {
  return (
    <PageWrapper metadata={metadata}>
      <Reset />
    </PageWrapper>
  )
}
