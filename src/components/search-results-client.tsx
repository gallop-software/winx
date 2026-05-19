'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import { BlogClient } from '@/components/blog/blog-client'

const PER_PAGE = 15

function LoadingDots() {
  return (
    <Span
      aria-hidden="true"
      className="after:content-['...'] after:animate-dots"
    />
  )
}

interface BlogPost {
  id: number
  slug: string
  url: string
  metadata: {
    title?: string
    date?: string
    description?: string
    categories?: string[]
    featuredImage?: string
    featuredImageWidth?: number
    featuredImageHeight?: number
  }
}

interface FetchResult {
  posts: BlogPost[]
  totalPages: number
}

let lastInitialFetch: { q: string; result: FetchResult } | null = null

function Inner() {
  const sp = useSearchParams()
  const q = (sp.get('s') || '').trim()

  const heading = q ? `Search Results For: ${q}` : 'Search Results For:'

  const hasInput = !!q

  const [state, setState] = useState<{
    loading: boolean
    result: FetchResult | null
    q: string
  }>(() => {
    if (!hasInput) return { loading: false, result: null, q }
    if (typeof window !== 'undefined' && lastInitialFetch?.q === q)
      return { loading: false, result: lastInitialFetch.result, q }
    return { loading: true, result: null, q }
  })

  const showLoading = hasInput && (state.loading || state.q !== q)
  const showResult = hasInput && !showLoading && state.result

  useEffect(() => {
    if (!hasInput) {
      setState({ loading: false, result: null, q })
      return
    }
    if (lastInitialFetch?.q === q) {
      setState({ loading: false, result: lastInitialFetch.result, q })
      return
    }
    let cancelled = false
    setState({ loading: true, result: null, q })
    const params = new URLSearchParams()
    params.set('page', '1')
    params.set('per_page', String(PER_PAGE))
    params.set('search', q)
    fetch(`/api/posts?${params.toString()}`)
      .then((res) => res.json())
      .then((data: FetchResult) => {
        if (cancelled) return
        lastInitialFetch = { q, result: data }
        setState({ loading: false, result: data, q })
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, result: null, q })
      })
    return () => {
      cancelled = true
    }
  }, [q, hasInput])

  return (
    <>
      <Heading as="h1" textAlign="text-left" margin="mb-12">
        {heading}
      </Heading>
      {!hasInput ? (
        <Paragraph textAlign="text-left">Enter a search term.</Paragraph>
      ) : showLoading ? (
        <Paragraph textAlign="text-left">
          Loading<LoadingDots />
        </Paragraph>
      ) : !showResult || state.result!.posts.length === 0 ? (
        <Paragraph textAlign="text-left">
          No results found{q ? ` for “${q}”` : ''}.
        </Paragraph>
      ) : (
        <BlogClient
          key={q}
          initialPosts={state.result!.posts}
          initialTotalPages={state.result!.totalPages}
          perPage={PER_PAGE}
          query={{ search: q }}
        />
      )}
    </>
  )
}

export function SearchResultsClient() {
  return (
    <Suspense
      fallback={
        <>
          <Heading as="h1" textAlign="text-left" margin="mb-12">
            Search Results For:
          </Heading>
          <Paragraph textAlign="text-left">
            Loading<LoadingDots />
          </Paragraph>
        </>
      }
    >
      <Inner />
    </Suspense>
  )
}
