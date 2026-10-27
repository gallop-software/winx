import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { BlogClient } from '@/components/blog/blog-client'
import type { BlogPost } from '@/utils/content-index'
import { filterPosts } from '@/utils/filter-posts'

// The page passes the posts it has already read for its structured data.
// Shown on its own, as in a block preview, it reads the first page itself.
interface ArchiveProps {
  posts?: BlogPost[]
  totalPages?: number
  page?: number
  perPage?: number
}

export default async function Archive({
  posts,
  totalPages,
  page = 1,
  perPage = 15,
}: ArchiveProps) {
  const first = posts ? null : await filterPosts({ page: 1, perPage })
  const shown = posts ?? first?.posts ?? []
  const pages = totalPages ?? first?.totalPages ?? 1

  return (
    <Section
      className="bg-body py-10"
      id="favorite-articles"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-baseline justify-between">
          <div>
            <Label margin="mb-2">Latest articles</Label>
            <Heading
              as="h2"
              styleAs="h1"
              margin="mb-10"
            >
              {page > 1 ? `Articles, page ${page}` : 'New writing'}
            </Heading>
          </div>
        </div>
        <BlogClient
          initialPosts={shown}
          initialTotalPages={pages}
          initialPage={page}
          perPage={perPage}
          pagePath="/"
        />
      </div>
    </Section>
  )
}
