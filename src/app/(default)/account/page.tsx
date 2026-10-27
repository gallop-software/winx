import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'

import Profile from './_blocks/profile'

const title = 'Your profile'
const description = 'Your name, email address, password, and what you would like by email.'

const metadata: PageMetadata = {
  title,
  description,
  slug: 'account',
  alternates: { canonical: '/account' },
}

// A member's own page: not for search engines.
export const generateMetadata = () => ({
  ...generatePageMetadata(metadata),
  robots: { index: false, follow: false },
})

export default function Page() {
  return (
    <PageWrapper metadata={metadata}>
      <Profile />
    </PageWrapper>
  )
}
