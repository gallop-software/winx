'use client'

import '@/styles/tailwind.css'
import { bodyFont } from '@/fonts/body'
import { headingFont } from '@/fonts/heading'
import { heading2Font } from '@/fonts/heading2'
import { heading3Font } from '@/fonts/heading3'
import { accentFont } from '@/fonts/accent'
import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Label } from '@/components/label'
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

export default function GlobalError() {
  return (
    <html
      lang="en"
      style={rootStyle}
    >
      <head>
        <title>Something Went Wrong</title>
      </head>
      <body className="bg-body font-body text-base font-medium leading-normal text-contrast antialiased">
        <div className="grid grid-cols-1 [grid-template-areas:'left''main''right'] md:grid-cols-[80px_minmax(0,1fr)] md:[grid-template-areas:'left_main'_'._right'] lg:grid-cols-[80px_minmax(0,1fr)_420px] lg:[grid-template-areas:'left_main_right'] xl:grid-cols-[232px_minmax(0,1fr)_420px]">
          <div className="[grid-area:left] sticky top-0 z-40 self-start md:h-screen">
            <Navigation />
          </div>
          <main className="[grid-area:main] min-w-0 px-7 md:pl-0 md:pr-7 pb-7 lg:pr-0 lg:pb-0 rounded-md">
            <Section className="bg-body pt-7">
              <div className="max-w-3xl">
                <Label margin="mb-2">500</Label>
                <Heading
                  as="h1"
                  margin="mb-2"
                >
                  Something Went Wrong
                </Heading>
                <Paragraph margin="mb-10">
                  An unexpected error occurred. Head back to the archive of
                  essays to keep reading.
                </Paragraph>
                <Button
                  variant="outline"
                  href="/"
                  native
                >
                  Return Home
                </Button>
              </div>
            </Section>
          </main>
          <div className="[grid-area:right] hidden lg:block w-full px-7 md:pl-0 lg:sticky lg:top-0 lg:self-start lg:h-screen lg:overflow-y-auto scrollbar-hide">
            <SideSection />
          </div>
          <FloatingSideButton />
        </div>
      </body>
    </html>
  )
}
