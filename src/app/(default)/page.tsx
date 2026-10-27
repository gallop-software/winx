import { notFound, permanentRedirect } from 'next/navigation'
import { PageWrapper } from '@/components/page-wrapper'
import { Heading } from '@/components/heading'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import {
  defaultDescription,
  schemaIds,
  siteName,
  siteTagline,
} from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'
import { filterPosts } from '@/utils/filter-posts'
import { getPostUrlById } from '@/utils/content-index'
import { getPagePathById } from '@/utils/pages'
import { readPageParam } from '@/utils/archive-seo'

import LogoCard from './_blocks/logo-card'
import Archive from './_blocks/archive'

const title = 'Founder Notes'
const description = defaultDescription

const PER_PAGE = 15

interface PageProps {
  searchParams: Promise<{
    page?: string | string[]
    p?: string | string[]
    page_id?: string | string[]
    s?: string | string[]
  }>
}

// Rendered on each visit from the content index, so a post shows here as soon
// as it has been synced.
export const dynamic = 'force-dynamic'

function pagePath(page: number) {
  return page > 1 ? `/?page=${page}` : '/'
}

// A WordPress id from ?p=N or ?page_id=N, the short addresses WordPress gives
// out, or null.
function wordPressId(value: string | string[] | undefined): number | null {
  const text = Array.isArray(value) ? value[0] : value
  return text && /^\d{1,9}$/.test(text) ? Number(text) : null
}

// Where a WordPress address on the home page leads now: a search (?s=) to
// the search page, a short address (?p=N, ?page_id=N) to the post or page.
// Null when there is none, or the id is not one the index knows: the home
// page is shown instead.
async function wordPressTarget(params: {
  p?: string | string[]
  page_id?: string | string[]
  s?: string | string[]
}): Promise<string | null> {
  const search = Array.isArray(params.s) ? params.s[0] : params.s
  if (search !== undefined) {
    return `/search/?s=${encodeURIComponent(search)}`
  }
  const postId = wordPressId(params.p)
  if (postId !== null) {
    const url = await getPostUrlById(postId)
    return url ? `${url}/` : null
  }
  const pageId = wordPressId(params.page_id)
  if (pageId !== null) {
    const path = await getPagePathById(pageId)
    return path ? `${path}/` : null
  }
  return null
}

// The home page's title is the site's name and what it is, not a page name
// with the site's name after it.
function pageTitle(page: number) {
  return page > 1
    ? `${siteName} – Page ${page}`
    : `${siteName} | ${siteTagline}`
}

export async function generateMetadata({ searchParams }: PageProps) {
  const page = readPageParam((await searchParams).page)
  if (!page) {
    return { title: 'Page Not Found', robots: { index: false, follow: false } }
  }

  const metadata: PageMetadata = {
    description,
    alternates: { canonical: pagePath(page) },
    openGraph: { type: 'website', title: pageTitle(page) },
  }
  return {
    ...generatePageMetadata(metadata),
    title: { absolute: pageTitle(page) },
  }
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const target = await wordPressTarget(params)
  if (target) permanentRedirect(target)

  const page = readPageParam(params.page)
  if (!page) notFound()

  const result = await filterPosts({ page, perPage: PER_PAGE })
  // A page past the last one is not a page.
  if (page > 1 && result.posts.length === 0) notFound()

  const metadata: PageMetadata = {
    title,
    structuredData: buildPageSchema({
      url: pagePath(page),
      title: pageTitle(page),
      description,
      type: 'CollectionPage',
      mainEntity: schemaIds.blog,
      posts: result.posts.map((post) => ({
        url: `${post.url}/`,
        title: post.metadata.title ?? '',
      })),
    }),
  }

  return (
    <PageWrapper metadata={metadata}>
      <Heading
        as="h1"
        className="sr-only"
      >
        {siteName}: {siteTagline}
      </Heading>
      {page === 1 && <LogoCard latest={result.posts[0]} />}
      <Archive
        posts={result.posts}
        totalPages={result.totalPages}
        page={page}
        perPage={PER_PAGE}
      />
    </PageWrapper>
  )
}
