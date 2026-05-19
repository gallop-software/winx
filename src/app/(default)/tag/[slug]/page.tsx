import { notFound } from 'next/navigation'
import { BlogClient } from '@/components/blog/blog-client'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { PageWrapper } from '@/components/page-wrapper'
import { Section } from '@/components/section'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { filterPosts } from '@/utils/filter-posts'
import { getAllTags, getTagBySlug } from '@/utils/taxonomies'
import { baseURL, defaultDescription } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'

const PER_PAGE = 15

interface PageProps {
  params: Promise<{ slug?: string }>
}

export function generateStaticParams() {
  return getAllTags().map((tag) => ({ slug: tag.slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  if (!slug) return { title: 'Tag Not Found' }
  const tag = getTagBySlug(slug)
  if (!tag) return { title: 'Tag Not Found' }

  const metadata: PageMetadata = {
    title: tag.name,
    slug: `tag/${slug}`,
    alternates: { canonical: `/tag/${slug}/` },
    description: tag.description || defaultDescription,
  }
  return generatePageMetadata(metadata, ['tag', slug])
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  if (!slug) notFound()
  const tag = getTagBySlug(slug)
  if (!tag) notFound()

  const result = filterPosts({
    tagSlug: tag.slug,
    page: 1,
    perPage: PER_PAGE,
  })
  const initialPosts = result.posts

  const url = `${baseURL}/tag/${slug}/`
  const metadata: PageMetadata = {
    title: tag.name,
    structuredData: buildPageSchema({
      url,
      title: tag.name,
      description: tag.description || defaultDescription,
      breadcrumbs: [
        { name: 'Home', href: '/' },
        { name: tag.name, href: `/tag/${slug}/` },
      ],
    }),
  }

  return (
    <PageWrapper metadata={metadata}>
      <Section className="bg-body pt-7">
        <Label margin="mb-2">Tag</Label>
        <Heading
          as="h1"
          margin="mb-10"
        >
          {tag.name}
        </Heading>
        <BlogClient
          initialPosts={initialPosts}
          initialTotalPages={result.totalPages}
          perPage={PER_PAGE}
          query={{ tagSlug: tag.slug }}
        />
      </Section>
    </PageWrapper>
  )
}
