type PostSlugItem = {
  slug: string
  modified: string
  uri: string
}

export async function getPostSlugs(): Promise<{ postSlugs: PostSlugItem[] }> {
  const wpJson = process.env.WORDPRESS_API_URL
  if (!wpJson) return { postSlugs: [] }

  const postSlugs: PostSlugItem[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(
      `${wpJson}/wp/v2/posts?_fields=slug,link,modified&per_page=100&page=${page}`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) break

    totalPages = Number(res.headers.get('X-WP-TotalPages') || '1')
    const posts = await res.json()

    for (const post of posts) {
      if (!post.link) continue
      const uri = new URL(post.link).pathname
      const cleanUri = uri.endsWith('/') ? uri.slice(0, -1) : uri

      postSlugs.push({
        slug: post.slug,
        modified: post.modified ? new Date(post.modified).toISOString() : new Date().toISOString(),
        uri: cleanUri,
      })
    }

    page++
  }

  return { postSlugs }
}
