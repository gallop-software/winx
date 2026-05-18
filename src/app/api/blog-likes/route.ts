import { prisma } from '@/utils/prisma'
import {
  getLikeCountFromDb,
  getLikesBatch,
  invalidateLike,
} from '@/utils/blog-likes'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { postId, anonId, action } = await request.json()
    const id = Number(postId)

    if (!Number.isInteger(id) || id <= 0 || !anonId || (action !== 'like' && action !== 'unlike')) {
      return NextResponse.json(
        { error: 'postId (positive int), anonId, and action ("like" | "unlike") are required' },
        { status: 400 }
      )
    }

    if (action === 'like') {
      await prisma.blogLike.createMany({
        data: [{ post_id: id, anon_id: anonId }],
        skipDuplicates: true,
      })
    } else {
      await prisma.blogLike.deleteMany({
        where: { post_id: id, anon_id: anonId },
      })
    }

    await invalidateLike(id)
    const count = await getLikeCountFromDb(id)

    return NextResponse.json({
      success: true,
      count,
      liked: action === 'like',
    })
  } catch (error) {
    console.error('Error toggling blog like:', error)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('postIds')
    const anonId = searchParams.get('anonId')

    if (!idsParam) {
      return NextResponse.json({ error: 'postIds query param is required' }, { status: 400 })
    }

    const ids = idsParam
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)

    if (ids.length === 0) {
      return NextResponse.json({ counts: {}, liked: {} })
    }

    const { counts, liked } = await getLikesBatch(ids, anonId)

    return NextResponse.json(
      { counts, liked },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Error fetching blog likes:', error)
    return NextResponse.json({ error: 'Failed to fetch likes' }, { status: 500 })
  }
}
