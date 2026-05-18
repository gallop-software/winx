type TagSlugItem = {
  slug: string
  uri: string
}

export async function getTagSlugs(): Promise<{ tagSlugs: TagSlugItem[] }> {
  const wpJson = (process.env.NEXT_PUBLIC_WORDPRESS_URL ? `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json` : undefined)
  if (!wpJson) return { tagSlugs: [] }

  const tagSlugs: TagSlugItem[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(
      `${wpJson}/wp/v2/tags?_fields=slug&hide_empty=true&per_page=100&page=${page}`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) break

    totalPages = Number(res.headers.get('X-WP-TotalPages') || '1')
    const tags = await res.json()

    for (const tag of tags) {
      tagSlugs.push({
        slug: tag.slug,
        uri: `/tag/${tag.slug}`,
      })
    }

    page++
  }

  return { tagSlugs }
}
