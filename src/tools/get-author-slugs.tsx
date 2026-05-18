type AuthorSlugItem = {
  slug: string
  uri: string
}

export async function getAuthorSlugs(): Promise<{ authorSlugs: AuthorSlugItem[] }> {
  const wpJson = (process.env.NEXT_PUBLIC_WORDPRESS_URL ? `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json` : undefined)
  if (!wpJson) return { authorSlugs: [] }

  const authorSlugs: AuthorSlugItem[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(
      `${wpJson}/wp/v2/users?_fields=slug&per_page=100&page=${page}`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) break

    totalPages = Number(res.headers.get('X-WP-TotalPages') || '1')
    const authors = await res.json()

    for (const author of authors) {
      authorSlugs.push({
        slug: author.slug,
        uri: `/author/${author.slug}`,
      })
    }

    page++
  }

  return { authorSlugs }
}
