import { BlogClient } from './blog-client'
import { filterPosts } from '@/utils/filter-posts'

export async function Blog({
  perPage = 15,
  categoriesInclude,
  categoriesExclude,
}: {
  perPage?: number
  categoriesInclude?: string[]
  categoriesExclude?: string[]
}) {
  // Note: categoriesInclude is matched by name in legacy callers
  // We forward exclude as names (case-insensitive); include is unused here
  void categoriesInclude

  const result = filterPosts({
    perPage,
    page: 1,
    ...(categoriesExclude?.length ? { categoriesExclude } : {}),
  })

  return (
    <BlogClient
      initialPosts={result.posts}
      initialTotalPages={result.totalPages}
      perPage={perPage}
      query={{
        ...(categoriesExclude?.length
          ? { categoriesExclude: categoriesExclude }
          : {}),
      }}
    />
  )
}
