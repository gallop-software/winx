import Script from 'next/script'
import { defaultStructuredData } from '@/app/metadata'
import { studioUrl } from '@/utils/studio-helpers'
import type { ReactNode } from 'react'
import type { PageMetadata } from '@/utils/page-helpers'

interface PageWrapperProps {
  children: ReactNode
  metadata?: PageMetadata
}

// Process structured data to resolve image URLs via studioUrl
function processStructuredData(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(processStructuredData)
  }
  if (data && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (key === 'image' && typeof value === 'string') {
        result[key] = studioUrl(value, 'large')
      } else {
        result[key] = processStructuredData(value)
      }
    }
    return result
  }
  return data
}

export function PageWrapper({ children, metadata }: PageWrapperProps) {
  const rawStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [...defaultStructuredData, ...(metadata?.structuredData || [])],
  }
  const structuredData = processStructuredData(rawStructuredData)

  return (
    <>
      <Script
        id="schema"
        type="application/ld+json"
      >
        {JSON.stringify(structuredData)}
      </Script>
      <main className="[&>.content-wrapper]:px-6 [&>.content-wrapper]:lg:px-8 [&>.content-wrapper]:mx-auto [&>.content-wrapper]:max-w-3xl [&>.aligncontent]:px-6 [&>.aligncontent]:lg:px-8 [&>.aligncontent]:mx-auto [&>.aligncontent]:max-w-3xl [&>*:last-child:not(div):not(section)]:mb-40 [&>*:last-child:is(.content-wrapper)]:mb-40">
        {children}
      </main>
    </>
  )
}
