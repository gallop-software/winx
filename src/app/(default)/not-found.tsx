import { NotFoundContent } from '@/components/not-found-content'
import { defaultOGImage } from '@/app/metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist.',
  robots: { index: false, follow: false },
  openGraph: { images: [defaultOGImage] },
}

// The layout already draws the shell; the root not-found.tsx draws its own
// for addresses that match no route at all.
export default function NotFound() {
  return <NotFoundContent className="bg-body pt-7" />
}
