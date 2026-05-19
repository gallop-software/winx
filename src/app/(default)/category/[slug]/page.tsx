import { notFound } from 'next/navigation'
import { BlogClient } from '@/components/blog/blog-client'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { PageWrapper } from '@/components/page-wrapper'
import { Section } from '@/components/section'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { filterPosts } from '@/utils/filter-posts'
import { getAllCategories, getCategoryBySlug } from '@/utils/taxonomies'
import { baseURL, defaultDescription } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'

const PER_PAGE = 15

interface PageProps {
  params: Promise<{ slug?: string }>
}

export function generateStaticParams() {
  return getAllCategories().map((cat) => ({ slug: cat.slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  if (!slug) return { title: 'Category Not Found' }
  const cat = getCategoryBySlug(slug)
  if (!cat) return { title: 'Category Not Found' }

  const metadata: PageMetadata = {
    title: cat.name,
    slug: `category/${slug}`,
    alternates: { canonical: `/category/${slug}/` },
    description: cat.description || defaultDescription,
  }
  return generatePageMetadata(metadata, ['category', slug])
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  if (!slug) notFound()
  const cat = getCategoryBySlug(slug)
  if (!cat) notFound()

  const result = filterPosts({
    categorySlug: cat.slug,
    page: 1,
    perPage: PER_PAGE,
  })
  const initialPosts = result.posts

  const url = `${baseURL}/category/${slug}/`
  const metadata: PageMetadata = {
    title: cat.name,
    structuredData: buildPageSchema({
      url,
      title: cat.name,
      description: cat.description || defaultDescription,
      breadcrumbs: [
        { name: 'Home', href: '/' },
        { name: cat.name, href: `/category/${slug}/` },
      ],
    }),
  }

  return (
    <PageWrapper metadata={metadata}>
      <Section className="pt-7 pb-10">
        <Label margin="mb-2">Category</Label>
        <Heading
          as="h1"
          margin="mb-10"
        >
          {cat.name}
        </Heading>
        <BlogClient
          initialPosts={initialPosts}
          initialTotalPages={result.totalPages}
          perPage={PER_PAGE}
          query={{ categorySlug: cat.slug }}
        />
      </Section>
    </PageWrapper>
  )
}
