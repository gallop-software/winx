import '@/styles/tailwind.css'
import { bodyFont } from '@/fonts/body'
import { headingFont } from '@/fonts/heading'
import { heading2Font } from '@/fonts/heading2'
import { heading3Font } from '@/fonts/heading3'
import { accentFont } from '@/fonts/accent'
import type { Metadata } from 'next'
import SmoothScroll from '@/hooks/smooth-scroll'
import IframeHeight from '@/hooks/use-iframe-height'
import { baseURL } from './metadata'
import GoogleAds from '@/hooks/google-ads'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/react'

export const revalidate = 86400

export const metadata: Metadata = {
  metadataBase: new URL(String(baseURL)),
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': 30,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  title: {
    default:
      'Founder Notes | Essays on Building Companies That Matter',
    template: '%s | Founder Notes',
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    siteName: 'Founder Notes',
    locale: 'en_US',
    type: 'website',
  },
}

const rootStyle = {
  ['--font-body-family' as string]: bodyFont.style.fontFamily,
  ['--font-heading-family' as string]: headingFont.style.fontFamily,
  ['--font-heading2-family' as string]: heading2Font.style.fontFamily,
  ['--font-heading3-family' as string]: heading3Font.style.fontFamily,
  ['--font-accent-family' as string]: accentFont.style.fontFamily,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      style={rootStyle}
    >
      <body className="bg-body2 font-body text-base font-medium leading-normal text-contrast antialiased">
        <div>{children}</div>
        <SmoothScroll />
        <IframeHeight />
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
      {process.env.NODE_ENV === 'production' &&
        process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS && (
          <GoogleAnalytics
            gaId={String(process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS)}
          />
        )}
      {process.env.NODE_ENV === 'production' &&
        process.env.NEXT_PUBLIC_GOOGLE_ADS_ID && (
          <GoogleAds
            adId={String(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID)}
            loadGtagJs={false}
          />
        )}
    </html>
  )
}
