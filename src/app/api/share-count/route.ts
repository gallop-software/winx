import { NextRequest, NextResponse } from 'next/server'
import { getPostIdsBySlugs } from '@/utils/content-index'
import {
  getShareCount,
  getShareCounts,
  recordShareIntent,
} from '@/utils/blog-shares'
import { shareTargets } from '@/utils/share-targets'

export const dynamic = 'force-dynamic'

const validTargets = new Set(shareTargets.map((t) => t.id))

export async function GET(request: NextRequest) {
  const slugsParam = request.nextUrl.searchParams.get('slugs')
  if (slugsParam !== null) {
    const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean)
    const ids = await getPostIdsBySlugs(slugs)
    const counts: Record<string, number> = {}
    for (const slug of slugs) counts[slug] = 0
    if (Object.keys(ids).length > 0) {
      const totals = await getShareCounts(Object.values(ids))
      for (const [slug, id] of Object.entries(ids)) {
        counts[slug] = totals[id] ?? 0
      }
    }
    return NextResponse.json(
      { counts },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const postId = (await getPostIdsBySlugs([slug]))[slug]
  if (postId === undefined) {
    return NextResponse.json({ count: 0 })
  }

  const count = await getShareCount(postId)
  return NextResponse.json(
    { count },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(request: NextRequest) {
  let body: { slug?: string; target?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { slug, target } = body
  if (!slug || !target) {
    return NextResponse.json(
      { error: 'Missing slug or target' },
      { status: 400 }
    )
  }
  if (!validTargets.has(target)) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  }

  const postId = (await getPostIdsBySlugs([slug]))[slug]
  if (postId === undefined) {
    return NextResponse.json({ error: 'Unknown slug' }, { status: 404 })
  }

  const count = await recordShareIntent(postId, target)
  return NextResponse.json({ count })
}
