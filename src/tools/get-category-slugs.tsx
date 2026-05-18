type CategorySlug = {
  slug: string
  uri: string
}

export async function getCategorySlugs(): Promise<{
  categorySlugs: CategorySlug[]
}> {
  const wpJson = (process.env.NEXT_PUBLIC_WORDPRESS_URL ? `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json` : undefined)
  if (!wpJson) return { categorySlugs: [] }

  const categorySlugs: CategorySlug[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(
      `${wpJson}/wp/v2/categories?_fields=slug&hide_empty=true&per_page=100&page=${page}`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) break

    totalPages = Number(res.headers.get('X-WP-TotalPages') || '1')
    const categories = await res.json()

    for (const cat of categories) {
      categorySlugs.push({
        slug: cat.slug,
        uri: `/category/${cat.slug}`,
      })
    }

    page++
  }

  return { categorySlugs }
}
