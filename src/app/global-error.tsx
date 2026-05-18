'use client'

import '@/styles/tailwind.css'
import { bodyFont } from '@/fonts/body'
import { headingFont } from '@/fonts/heading'
import { heading2Font } from '@/fonts/heading2'
import { heading3Font } from '@/fonts/heading3'
import { accentFont } from '@/fonts/accent'
import { Heading } from '@/components/heading'
import { Button } from '@/components/button'
import { Navigation } from '@/components/navigation'
import { SideSection } from '@/components/side-section'
import { FloatingSideButton } from '@/components/floating-side-button'

const rootStyle = {
  ['--font-body-family' as string]: bodyFont.style.fontFamily,
  ['--font-heading-family' as string]: headingFont.style.fontFamily,
  ['--font-heading2-family' as string]: heading2Font.style.fontFamily,
  ['--font-heading3-family' as string]: heading3Font.style.fontFamily,
  ['--font-accent-family' as string]: accentFont.style.fontFamily,
}

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html
      lang="en"
      style={rootStyle}
    >
      <head>
        <title>Something Went Wrong</title>
      </head>
      <body className="bg-body2 font-body text-base font-medium leading-normal text-contrast antialiased">
        <div className="grid grid-cols-1 [grid-template-areas:'left''main''right'] md:grid-cols-[80px_minmax(0,1fr)] md:[grid-template-areas:'left_main'_'._right'] lg:grid-cols-[80px_minmax(0,1fr)_420px] lg:[grid-template-areas:'left_main_right'] xl:grid-cols-[232px_minmax(0,1fr)_420px] lg:h-screen lg:overflow-hidden">
          <div className="[grid-area:left] sticky top-0 z-10 md:h-screen md:self-start">
            <Navigation />
          </div>
          <main className="[grid-area:main] min-w-0 px-7 md:pl-0 md:pr-7 pb-7 lg:pr-0 lg:pb-0 lg:h-full lg:overflow-y-auto rounded-md scrollbar-hide">
            <div className="px-6 lg:px-8 mx-auto max-w-3xl text-center mb-40 pt-24">
              <Heading as="h1">Something Went Wrong</Heading>
              <Button
                variant="outline"
                onClick={() => reset()}
              >
                Try Again
              </Button>
            </div>
          </main>
          <div className="[grid-area:right] hidden lg:block w-full pl-7 md:pl-0 lg:h-screen lg:overflow-hidden">
            <SideSection />
          </div>
          <FloatingSideButton />
        </div>
      </body>
    </html>
  )
}
