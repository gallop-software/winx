import { Navigation } from '@/components/navigation'
import { SideSection } from '@/components/side-section'
import { FloatingSideButton } from '@/components/floating-side-button'

export default function DefaultLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="grid grid-cols-1 [grid-template-areas:'left''main''right'] md:grid-cols-[80px_minmax(0,1fr)] md:[grid-template-areas:'left_main'_'._right'] lg:grid-cols-[80px_minmax(0,1fr)_420px] lg:[grid-template-areas:'left_main_right'] xl:grid-cols-[232px_minmax(0,1fr)_420px]">
      <div className="[grid-area:left] sticky top-0 z-40 self-start md:h-screen">
        <Navigation />
      </div>
      <main className="[grid-area:main] min-w-0 px-7 md:pl-0 md:pr-7 pb-7 lg:pr-0 lg:pb-0 rounded-md">
        {children}
      </main>
      <div className="[grid-area:right] hidden lg:block w-full px-7 md:pl-0 lg:sticky lg:top-0 lg:self-start lg:h-screen lg:overflow-y-auto scrollbar-hide">
        <SideSection />
      </div>
      <FloatingSideButton />
    </div>
  )
}
