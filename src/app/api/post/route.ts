import { NextRequest, NextResponse } from 'next/server'
import blogData from '@/../_data/_blog.json'
import { getShareCount } from '@/utils/blog-shares'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const wpJson = (process.env.NEXT_PUBLIC_WORDPRESS_URL ? `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json` : undefined)
  if (!wpJson) {
    return NextResponse.json({ error: 'WordPress API not configured' }, { status: 500 })
  }

  const res = await fetch(`${wpJson}/wp/v2/posts?slug=${encodeURIComponent(slug)}`, {
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 502 })
  }

  const posts = await res.json()
  if (!posts.length) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const localPost = (blogData as { id: number; slug: string }[]).find(
    (p) => p.slug === slug
  )
  const shareCount = localPost ? await getShareCount(localPost.id) : 0

  return NextResponse.json({
    content: posts[0].content?.rendered || '',
    shareCount,
  })
}
