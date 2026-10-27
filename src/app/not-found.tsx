import { Navigation } from '@/components/navigation'
import { SideSection } from '@/components/side-section'
import { FloatingSideButton } from '@/components/floating-side-button'
import { AdminBar } from '@/components/admin-bar'
import { NotFoundContent } from '@/components/not-found-content'
import { defaultOGImage } from '@/app/metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist.',
  robots: { index: false, follow: false },
  openGraph: { images: [defaultOGImage] },
}

export default function NotFound() {
  return (
    <div className="grid grid-cols-1 [grid-template-areas:'left''main''right'] md:grid-cols-[80px_minmax(0,1fr)] md:[grid-template-areas:'left_main'_'._right'] lg:grid-cols-[80px_minmax(0,1fr)_420px] lg:[grid-template-areas:'left_main_right'] xl:grid-cols-[232px_minmax(0,1fr)_420px]">
      <div className="[grid-area:left] sticky top-(--admin-bar) z-40 self-start md:h-[calc(100vh-var(--admin-bar))]">
        <Navigation />
      </div>
      <main className="[grid-area:main] min-w-0 px-7 md:pl-0 md:pr-7 pb-7 lg:pr-0 lg:pb-0 rounded-md">
        <NotFoundContent className="bg-body pt-7" />
      </main>
      <div className="[grid-area:right] hidden lg:block w-full px-7 md:pl-0 lg:sticky lg:top-(--admin-bar) lg:self-start lg:h-[calc(100vh-var(--admin-bar))] lg:overflow-y-auto scrollbar-hide">
        <SideSection />
      </div>
      <FloatingSideButton />
      <AdminBar />
    </div>
  )
}
