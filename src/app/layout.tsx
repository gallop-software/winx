import '@/styles/tailwind.css'
import { bodyFont } from '@/fonts/body'
import { headingFont } from '@/fonts/heading'
import { heading2Font } from '@/fonts/heading2'
import { heading3Font } from '@/fonts/heading3'
import { accentFont } from '@/fonts/accent'
import type { Metadata } from 'next'
import SmoothScroll from '@/hooks/smooth-scroll'
import LoginDialog from '@/components/login'
import IframeHeight from '@/hooks/use-iframe-height'
import PageView from '@/hooks/page-view'
import FlowTrace from '@/hooks/flow-trace'
import {
  baseURL,
  defaultDescription,
  defaultOGImage,
  defaultSEOConfig,
  siteName,
  siteTagline,
  twitterHandle,
} from './metadata'
import GoogleAds from '@/hooks/google-ads'
import { GoogleAnalytics } from '@next/third-parties/google'

export const revalidate = 86400

export const metadata: Metadata = {
  metadataBase: new URL(String(baseURL)),
  robots: defaultSEOConfig.robots,
  title: {
    default: `${siteName} | ${siteTagline}`,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  alternates: {
    types: { 'application/rss+xml': [{ url: '/feed/', title: siteName }] },
  },
  openGraph: {
    siteName,
    locale: 'en_US',
    type: 'website',
    images: [defaultOGImage],
  },
  twitter: {
    card: 'summary_large_image',
    site: twitterHandle,
    creator: twitterHandle,
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
      <body className="bg-body font-body text-base font-medium leading-normal text-contrast antialiased">
        <div>{children}</div>
        <SmoothScroll />
        <LoginDialog />
        <IframeHeight />
        <PageView />
        <FlowTrace />
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
