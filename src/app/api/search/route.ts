import { NextRequest, NextResponse } from 'next/server'
import { searchPosts } from '@/utils/content-index'
import { searchPages } from '@/utils/search-pages'

export const dynamic = 'force-dynamic'

const MAX_QUERY_LENGTH = 200

// Results for the search dialog: pages first, then posts, best match first.
// In each snippet the matched words sit between the two marker characters
// exported by src/utils/content-index.ts.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const query = (searchParams.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH)
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get('limit') || '20') || 20)
  )

  if (!query) return NextResponse.json({ results: [] })

  const pages = await searchPages(query)
  const posts = await searchPosts(query, limit)

  return NextResponse.json(
    { results: [...pages, ...posts].slice(0, limit) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
