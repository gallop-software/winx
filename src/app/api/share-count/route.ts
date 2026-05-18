import { NextRequest, NextResponse } from 'next/server'
import blogData from '@/../_data/_blog.json'
import {
  getShareCount,
  getShareCounts,
  recordShareIntent,
} from '@/utils/blog-shares'
import { shareTargets } from '@/utils/share-targets'

export const dynamic = 'force-dynamic'

const validTargets = new Set(shareTargets.map((t) => t.id))

function findPost(slug: string) {
  return (blogData as { id: number; slug: string }[]).find(
    (p) => p.slug === slug
  )
}

export async function GET(request: NextRequest) {
  const slugsParam = request.nextUrl.searchParams.get('slugs')
  if (slugsParam !== null) {
    const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean)
    const posts = (blogData as { id: number; slug: string }[]).filter((p) =>
      slugs.includes(p.slug)
    )
    const counts: Record<string, number> = {}
    for (const slug of slugs) counts[slug] = 0
    if (posts.length > 0) {
      const totals = await getShareCounts(posts.map((p) => p.id))
      for (const post of posts) counts[post.slug] = totals[post.id] ?? 0
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

  const post = findPost(slug)
  if (!post) {
    return NextResponse.json({ count: 0 })
  }

  const count = await getShareCount(post.id)
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

  const post = findPost(slug)
  if (!post) {
    return NextResponse.json({ error: 'Unknown slug' }, { status: 404 })
  }

  const count = await recordShareIntent(post.id, target)
  return NextResponse.json({ count })
}
