import { NextRequest, NextResponse } from 'next/server'
import { filterPosts } from '@/utils/filter-posts'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const perPage = Math.min(
    50,
    Math.max(1, Number(searchParams.get('per_page') || '15'))
  )

  const params: Parameters<typeof filterPosts>[0] = { page, perPage }
  const categorySlug = (searchParams.get('category') || '').trim()
  if (categorySlug) params.categorySlug = categorySlug
  const tagSlug = (searchParams.get('tag') || '').trim()
  if (tagSlug) params.tagSlug = tagSlug
  const authorSlug = (searchParams.get('author') || '').trim()
  if (authorSlug) params.authorSlug = authorSlug
  const exclude = (searchParams.get('exclude_categories') || '').trim()
  if (exclude) params.categoriesExclude = exclude.split(',').filter(Boolean)
  const search = (searchParams.get('search') || '').trim()
  if (search) params.search = search

  const result = filterPosts(params)
  return NextResponse.json({
    posts: result.posts,
    totalPages: result.totalPages,
  })
}
