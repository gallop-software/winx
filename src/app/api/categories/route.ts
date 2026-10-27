import { NextResponse } from 'next/server'
import { getAllCategories } from '@/utils/taxonomies'

export const dynamic = 'force-dynamic'

// The categories for the navigation and the category dropdown, which are
// client components and cannot read the content index themselves.
export async function GET() {
  const categories = await getAllCategories()
  return NextResponse.json(
    {
      categories: categories.map((c) => ({
        name: c.name,
        slug: c.slug,
        count: c.count ?? 0,
      })),
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } }
  )
}
