import Link from 'next/link'
import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Image } from '@/components/image'
import { filterPosts } from '@/utils/filter-posts'
import { getAllCategories } from '@/utils/taxonomies'

// Enough for every post on the site: they are listed, not paged.
const ALL_POSTS = 1000

// Category display order on /essays. Slugs listed here appear first, in
// this order; any categories not listed fall through in their default order.
const CATEGORY_ORDER: string[] = []

// Every post under each of its categories, read from the content index, so a
// newly synced post shows here at once.
export default async function Archive() {
  const [categories, { posts }] = await Promise.all([
    getAllCategories(),
    filterPosts({ page: 1, perPage: ALL_POSTS }),
  ])

  const orderedCategories = [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.slug)
    const bi = CATEGORY_ORDER.indexOf(b.slug)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const groups = orderedCategories
    .map((cat) => {
      const matched = posts.filter((p) =>
        (p.metadata.categorySlugs || []).includes(cat.slug)
      )
      return { cat, posts: matched }
    })
    .filter((g) => g.posts.length > 0)

  return (
    <Section className="bg-body pb-10 pt-5">
      <div className="max-w-4xl mx-auto space-y-12">
        {groups.map(({ cat, posts: catPosts }) => (
          <div key={cat.slug}>
            <Heading
              as="h2"
              margin="mb-2"
            >
              <Link href={`/category/${cat.slug}`}>{cat.name}</Link>
            </Heading>
            <div className="flex flex-col">
              {catPosts.map((post) => (
                <article
                  key={post.slug}
                  className="relative flex items-start gap-4 sm:gap-6 py-3 border-b border-accent5 last:border-b-0 group"
                >
                  <Link
                    href={`${post.url}/`}
                    prefetch={false}
                    aria-label={post.metadata.title}
                    className="absolute inset-0 z-0"
                  />
                  {post.metadata.featuredImage && (
                    <div className="flex-none w-20 sm:w-24 md:w-28">
                      <Image
                        src={post.metadata.featuredImage}
                        alt={post.metadata.title || ''}
                        size="small"
                        width={post.metadata.featuredImageWidth}
                        height={post.metadata.featuredImageHeight}
                        className="w-full h-auto block"
                        rounded="rounded-sm"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Paragraph
                      margin="mb-0"
                      className="group-hover:text-accent transition-colors"
                    >
                      {post.metadata.title}
                    </Paragraph>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
