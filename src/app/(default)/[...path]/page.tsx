import { notFound, permanentRedirect } from 'next/navigation'
import { PageWrapper } from '@/components/page-wrapper'
import { generatePageMetadata } from '@/utils/page-helpers'
import {
  archiveMetadata,
  archiveSchema,
  readPageParam,
} from '@/utils/archive-seo'
import { loadDateArchive } from '@/utils/date-archive'
import { loadPost, postMetadata } from '@/utils/post-page'
import { loadWordPressPage, wordPressPageMetadata } from '@/utils/wp-page'

import DateArchive from './_blocks/date-archive'
import Post from './_blocks/post'
import WpPage from './_blocks/wp-page'

// Everything WordPress publishes is served here, by the shape of the path:
// a year (/2026/), a month (/2026/09/), a post (/2026/09/its-slug/), and any
// other path a page the content index knows (/about/,
// /guides/hiring/). A static route beside this one wins.

interface PageProps {
  params: Promise<{ path: string[] }>
  searchParams: Promise<{ page?: string | string[] }>
}

// Rendered on each visit: the posts and pages come from the content index
// and the post cache, so a post or a page shows as soon as it is synced.
// Prerendering would send WordPress more requests at once than it allows.
export const dynamic = 'force-dynamic'

const YEAR = /^\d{4}$/
const MONTH = /^\d{2}$/
const PAGE_NUMBER = /^\d{1,5}$/

type Route =
  | { kind: 'year'; year: string }
  | { kind: 'month'; year: string; month: string }
  | { kind: 'post'; year: string; month: string; slug: string }
  | { kind: 'page'; path: string }

function routeOf(path: string[]): Route {
  const [first = '', second = '', third = ''] = path
  if (path.length === 1 && YEAR.test(first))
    return { kind: 'year', year: first }
  if (path.length === 2 && YEAR.test(first) && MONTH.test(second)) {
    return { kind: 'month', year: first, month: second }
  }
  if (path.length === 3 && YEAR.test(first) && MONTH.test(second)) {
    return { kind: 'post', year: first, month: second, slug: third }
  }
  return { kind: 'page', path: `/${path.join('/')}` }
}

const notFoundMetadata = (what: string) => ({
  title: `${what} Not Found`,
  robots: { index: false, follow: false },
})

export async function generateMetadata({ params, searchParams }: PageProps) {
  const route = routeOf((await params).path)

  switch (route.kind) {
    case 'year':
    case 'month': {
      const page = readPageParam((await searchParams).page)
      const month = route.kind === 'month' ? route.month : undefined
      const loaded = page
        ? await loadDateArchive(route.year, month, page)
        : null
      if (!page || !loaded) {
        return notFoundMetadata(route.kind === 'year' ? 'Year' : 'Month')
      }
      return generatePageMetadata(archiveMetadata(loaded.archive, page))
    }
    case 'post': {
      const loaded = await loadPost(route.year, route.month, route.slug)
      if (!loaded) return notFoundMetadata('Post')
      return generatePageMetadata(
        postMetadata(loaded, `/${route.year}/${route.month}/${route.slug}/`)
      )
    }
    case 'page': {
      const loaded = await loadWordPressPage(route.path)
      if (!loaded) return notFoundMetadata('Page')
      return generatePageMetadata(wordPressPageMetadata(loaded))
    }
  }
}

export default async function Page({ params, searchParams }: PageProps) {
  const path = (await params).path
  // WordPress pages the home page as /page/N/. (A
  // redirect in next.config.mjs cannot send to /?page=N: its router reads
  // the "/?" as a modifier.)
  if (path.length === 2 && path[0] === 'page' && PAGE_NUMBER.test(path[1]!)) {
    permanentRedirect(`/?page=${Number(path[1])}`)
  }
  const route = routeOf(path)

  switch (route.kind) {
    case 'year':
    case 'month': {
      const page = readPageParam((await searchParams).page)
      const month = route.kind === 'month' ? route.month : undefined
      const loaded = page
        ? await loadDateArchive(route.year, month, page)
        : null
      if (!page || !loaded) notFound()
      // A page past the last one is not a page.
      if (page > 1 && loaded.result.posts.length === 0) notFound()
      return (
        <PageWrapper
          metadata={{
            structuredData: archiveSchema(
              loaded.archive,
              page,
              loaded.result.posts
            ),
          }}
        >
          <DateArchive
            loaded={loaded}
            page={page}
            year={route.year}
            {...(month ? { month } : {})}
          />
        </PageWrapper>
      )
    }
    case 'post': {
      const loaded = await loadPost(route.year, route.month, route.slug)
      if (!loaded) notFound()
      return (
        <Post
          loaded={loaded}
          year={route.year}
          month={route.month}
          slug={route.slug}
        />
      )
    }
    case 'page': {
      const loaded = await loadWordPressPage(route.path)
      if (!loaded) notFound()
      return (
        <PageWrapper metadata={wordPressPageMetadata(loaded)}>
          <WpPage loaded={loaded} />
        </PageWrapper>
      )
    }
  }
}
