import { notFound } from 'next/navigation'
import { BlogClient } from '@/components/blog/blog-client'
import { Heading } from '@/components/heading'
import { PageWrapper } from '@/components/page-wrapper'
import { Section } from '@/components/section'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { filterPosts } from '@/utils/filter-posts'
import { getAllAuthors, getAuthorBySlug } from '@/utils/taxonomies'
import { baseURL, defaultDescription } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'

const PER_PAGE = 15

interface PageProps {
  params: Promise<{ slug?: string }>
}

export function generateStaticParams() {
  return getAllAuthors().map((author) => ({ slug: author.slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  if (!slug) return { title: 'Author Not Found' }
  const author = getAuthorBySlug(slug)
  if (!author) return { title: 'Author Not Found' }

  const metadata: PageMetadata = {
    title: author.name,
    slug: `author/${slug}`,
    alternates: { canonical: `/author/${slug}/` },
    description: author.description || defaultDescription,
  }
  return generatePageMetadata(metadata, ['author', slug])
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  if (!slug) notFound()
  const author = getAuthorBySlug(slug)
  if (!author) notFound()

  const result = filterPosts({
    authorSlug: author.slug,
    page: 1,
    perPage: PER_PAGE,
  })
  const initialPosts = result.posts

  const url = `${baseURL}/author/${slug}/`
  const metadata: PageMetadata = {
    title: author.name,
    structuredData: buildPageSchema({
      url,
      title: author.name,
      description: author.description || defaultDescription,
      breadcrumbs: [
        { name: 'Home', href: '/' },
        { name: author.name, href: `/author/${slug}/` },
      ],
    }),
  }

  return (
    <PageWrapper metadata={metadata}>
      <Section className="bg-body2 pt-7 pb-20">
        <Heading
          as="h1"
          textAlign="text-left"
          margin="mb-12"
        >
          {author.name}
        </Heading>
        <BlogClient
          initialPosts={initialPosts}
          initialTotalPages={result.totalPages}
          perPage={PER_PAGE}
          query={{ authorSlug: author.slug }}
        />
      </Section>
    </PageWrapper>
  )
}
