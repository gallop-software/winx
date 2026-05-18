import Link from 'next/link'
import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Image } from '@/components/image'
import blogData from '@/../_data/_blog.json'
import { getAllCategories } from '@/utils/taxonomies'
import type { BlogPost } from '@/utils/filter-posts'

const posts = blogData as BlogPost[]

// Category display order on /all-articles. Slugs listed here appear first, in
// this order; any categories not listed fall through in their default order.
const CATEGORY_ORDER: string[] = [
  'amazon-hq2',
  'architects-architecture',
  'dallas-insights',
  'dallas-neighborhoods',
  'favorites',
  'forwarddallas',
  'home-tours-events',
  'homes-for-sale',
  'homes-that-make-us-happy',
  'organic-urbanism',
  'preservation',
  'preservation-steps-for-saving-homes',
  'real-estate-insights',
  'short-term-rentals',
  'uncategorized',
  'urban-growth',
  'adu',
]

export default function Archive() {
  const categories = getAllCategories()

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
    <Section className="bg-body2 pt-0 pb-20">
      <div className="max-w-4xl mx-auto space-y-14">
        {groups.map(({ cat, posts: catPosts }) => (
          <div key={cat.slug}>
            <Heading
              as="h2"
              margin="mb-0"
            >
              <Link href={`/category/${cat.slug}`}>{cat.name}</Link>
            </Heading>
            <div className="flex flex-col">
              {catPosts.map((post) => (
                <article
                  key={post.slug}
                  className="relative flex items-start gap-4 sm:gap-6 py-3 border-b border-contrast/10 last:border-b-0 group"
                >
                  <Link
                    href={post.url}
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
