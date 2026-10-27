import { notFound } from 'next/navigation'
import { BlogClient } from '@/components/blog/blog-client'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { PageWrapper } from '@/components/page-wrapper'
import { Paragraph } from '@/components/paragraph'
import { Section } from '@/components/section'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { filterPosts } from '@/utils/filter-posts'
import { getAuthorBySlug } from '@/utils/taxonomies'
import {
  archiveLabel,
  archiveMetadata,
  archivePath,
  archiveSchema,
  readPageParam,
  type Archive,
} from '@/utils/archive-seo'

const PER_PAGE = 15

interface PageProps {
  params: Promise<{ slug?: string }>
  searchParams: Promise<{ page?: string | string[] }>
}

// Rendered on each visit from the content index, so a post shows here as soon
// as it has been synced.
export const dynamic = 'force-dynamic'

const notFoundMetadata = {
  title: 'Author Not Found',
  robots: { index: false, follow: false },
}

async function getArchive(slug: string | undefined): Promise<Archive | null> {
  if (!slug) return null
  const found = await getAuthorBySlug(slug)
  return found ? { ...found, kind: 'author' } : null
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const archive = await getArchive((await params).slug)
  const page = readPageParam((await searchParams).page)
  if (!archive || !page) return notFoundMetadata

  return generatePageMetadata(archiveMetadata(archive, page))
}

export default async function Page({ params, searchParams }: PageProps) {
  const archive = await getArchive((await params).slug)
  const page = readPageParam((await searchParams).page)
  if (!archive || !page) notFound()

  const result = await filterPosts({
    authorSlug: archive.slug,
    page,
    perPage: PER_PAGE,
  })
  // A page past the last one is not a page.
  if (page > 1 && result.posts.length === 0) notFound()

  const metadata: PageMetadata = {
    structuredData: archiveSchema(archive, page, result.posts),
  }

  return (
    <PageWrapper metadata={metadata}>
      <Section className="bg-body pt-7 pb-10">
        <Label margin="mb-2">{archiveLabel(archive.kind)}</Label>
        <Heading
          as="h1"
          margin={archive.description ? 'mb-4' : 'mb-10'}
        >
          {archive.name}
        </Heading>
        {archive.description && (
          <Paragraph margin="mb-10">{archive.description}</Paragraph>
        )}
        {result.posts.length === 0 && (
          <Paragraph>There are no articles here yet.</Paragraph>
        )}
        <BlogClient
          initialPosts={result.posts}
          initialTotalPages={result.totalPages}
          initialPage={page}
          perPage={PER_PAGE}
          query={{ authorSlug: archive.slug }}
          pagePath={archivePath(archive)}
        />
      </Section>
    </PageWrapper>
  )
}
