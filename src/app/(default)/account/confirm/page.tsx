import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'

import Confirm from './_blocks/confirm'

const title = 'Confirm your email address'
const description = 'Confirm the email address for your account.'

const metadata: PageMetadata = {
  title,
  description,
  slug: 'account/confirm',
  alternates: { canonical: '/account/confirm' },
}

// A member's own page: not for search engines.
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
