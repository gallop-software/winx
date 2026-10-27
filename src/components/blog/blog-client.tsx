'use client'

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useInView } from 'react-intersection-observer'
import { Heading } from '@/components/heading'
import { Image } from '@/components/image'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import { PostActions } from '@/components/post-actions'
import { baseURL } from '@/app/metadata'
import { renderPostTitle } from '@/utils/post-title'
import { htmlToText } from '@/utils/html-text'
import {
  SidebarStackProvider,
  useSidebarStack,
  AsyncSidebarRenderer,
  type ContentLoader,
} from '@/components/sidebar-stack'
import clsx from 'clsx'
import Link from 'next/link'
import { ParseBlocks } from '@/utils/parse-blocks'
import { state } from '@/state'
import { getOrCreateAnonId } from '@/utils/anon-id'
import { DateTime } from 'luxon'

// How wide a post's image is shown: the full column, which stops growing at
// 600px. Below that it is the screen less the page's side padding.
const IMAGE_SIZES = '(min-width: 656px) 600px, calc(100vw - 56px)'

interface BlogPost {
  id: number
  slug: string
  url: string
  metadata: {
    title?: string
    date?: string
    description?: string
    categories?: string[]
    featuredImage?: string
    featuredImageWidth?: number
    featuredImageHeight?: number
    featuredImageSrcSet?: string
    commentCount?: number
    commentsOpen?: boolean
  }
}

export interface BlogQuery {
  authorSlug?: string
  categorySlug?: string
  tagSlug?: string
  categoriesExclude?: string[]
  search?: string
  year?: string
  month?: string
}

const blogContentLoader: ContentLoader = async (
  componentId: string
): Promise<ReactNode> => {
  if (!componentId) {
    return <div className="text-red-500">Error: No post ID provided</div>
  }

  try {
    const res = await fetch(`/api/post?slug=${encodeURIComponent(componentId)}`)
    if (!res.ok) {
      return <div className="text-red-500">Error: Post not found</div>
    }
    const data = await res.json()
    return <ParseBlocks content={data.content} />
  } catch {
    return <div className="text-red-500">Error: Failed to load post</div>
  }
}

type PageResult = { posts: BlogPost[]; totalPages: number } | null

type BlogCacheEntry = {
  posts: BlogPost[]
  page: number
  totalPages: number
  scrollY: number
}

const blogCache = new Map<string, BlogCacheEntry>()

export function resetBlogScroll() {
  for (const entry of blogCache.values()) entry.scrollY = 0
}

const getCacheKey = (query: BlogQuery, firstPage: number) =>
  JSON.stringify({
    p: firstPage,
    a: query.authorSlug ?? '',
    c: query.categorySlug ?? '',
    t: query.tagSlug ?? '',
    e: query.categoriesExclude ?? [],
    s: query.search ?? '',
    y: query.year ?? '',
    m: query.month ?? '',
  })

interface BlogClientInnerProps {
  initialPosts: BlogPost[]
  initialTotalPages: number
  initialPage: number
  perPage: number
  query: BlogQuery
  pagePath?: string
  loader?: (page: number, perPage: number) => Promise<PageResult>
}

// Inner component that uses the sidebar stack context
function BlogClientInner({
  initialPosts,
  initialTotalPages,
  initialPage,
  perPage,
  query,
  pagePath,
  loader,
}: BlogClientInnerProps) {
  const cacheKey = getCacheKey(query, initialPage)
  const cached =
    typeof window !== 'undefined' ? blogCache.get(cacheKey) : undefined
  const [posts, setPosts] = useState<BlogPost[]>(cached?.posts ?? initialPosts)
  const [page, setPage] = useState(cached?.page ?? initialPage)
  const [totalPages, setTotalPages] = useState(
    cached?.totalPages ?? initialTotalPages
  )
  // When the server sends a new list for the same page, after the admin
  // bar's refresh, it replaces what was kept, including the pages scrolled
  // to since.
  const [adopted, setAdopted] = useState(initialPosts)
  if (adopted !== initialPosts) {
    setAdopted(initialPosts)
    setPosts(initialPosts)
    setPage(initialPage)
    setTotalPages(initialTotalPages)
    blogCache.delete(cacheKey)
  }

  useEffect(() => {
    blogCache.set(cacheKey, {
      posts,
      page,
      totalPages,
      scrollY: blogCache.get(cacheKey)?.scrollY ?? 0,
    })
  }, [cacheKey, posts, page, totalPages])

  useEffect(() => {
    const slugById = new Map<number, string>()
    for (const p of posts) slugById.set(p.id, p.slug)

    const missingPostIds = posts
      .map((p) => p.id)
      .filter(
        (id) =>
          state.likeCounts[slugById.get(id)!] === undefined ||
          state.liked[id] === undefined
      )
    const missingShareSlugs = posts
      .map((p) => p.slug)
      .filter((slug) => state.shareCounts[slug] === undefined)

    let cancelled = false

    if (missingPostIds.length > 0) {
      const anonId = getOrCreateAnonId()
      const params = new URLSearchParams({
        postIds: missingPostIds.join(','),
        anonId,
      })
      fetch(`/api/blog-likes/?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return
          for (const id of missingPostIds) {
            const slug = slugById.get(id)!
            if (state.likeCounts[slug] === undefined) {
              state.likeCounts[slug] = data.counts?.[id] ?? 0
            }
            if (state.liked[id] === undefined) {
              state.liked[id] = Boolean(data.liked?.[id])
            }
          }
        })
        .catch(() => {})
    }

    if (missingShareSlugs.length > 0) {
      const params = new URLSearchParams({ slugs: missingShareSlugs.join(',') })
      fetch(`/api/share-count/?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return
          for (const slug of missingShareSlugs) {
            if (state.shareCounts[slug] === undefined) {
              state.shareCounts[slug] = data.counts?.[slug] ?? 0
            }
          }
        })
        .catch(() => {})
    }

    return () => {
      cancelled = true
    }
  }, [posts])

  // Restore scroll position on mount when returning to a cached view, and
  // continuously track scroll so the next return lands in the same spot.
  useEffect(() => {
    const restoreY = cached?.scrollY ?? 0
    if (restoreY > 0) {
      requestAnimationFrame(() => window.scrollTo(0, restoreY))
    }
    const onScroll = () => {
      const entry = blogCache.get(cacheKey)
      if (entry) entry.scrollY = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])
  const [isLoading, setIsLoading] = useState(false)
  const prefetchRef = useRef<{
    page: number
    promise: Promise<{ posts: BlogPost[]; totalPages: number } | null>
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [columns, setColumns] = useState(1)
  const [isMasonryEnabled, setIsMasonryEnabled] = useState(false)
  const [containerHeight, setContainerHeight] = useState(0)
  const [layoutKey, setLayoutKey] = useState(0)

  const { setContentLoader } = useSidebarStack()

  // Set the content loader on mount
  useEffect(() => {
    setContentLoader(blogContentLoader)
  }, [setContentLoader])

  const currentPosts = posts.filter((post) => post.metadata.title && post.url)
  const hasMore = page < totalPages

  // Calculate number of columns based on screen width
  useEffect(() => {
    const updateColumns = () => {
      setColumns(1)
      setIsMasonryEnabled(false)
    }

    updateColumns()

    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        updateColumns()
        setLayoutKey((prev) => prev + 1)
      }, 150)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [])

  // Layout calculation (masonry for multi-column, simple for single column)
  const calculateLayout = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const containerWidth = container.offsetWidth

    if (!isMasonryEnabled) {
      itemRefs.current.forEach((item) => {
        if (!item) return
        item.style.cssText = ''
      })
      setContainerHeight(0)
      return
    }

    const gap = 32
    const availableWidth = Math.max(
      containerWidth - gap * (columns - 1),
      columns * 200
    )
    const columnWidth = availableWidth / columns
    const columnHeights = new Array(columns).fill(0)

    itemRefs.current.forEach((item) => {
      if (!item) return

      const shortestColumnIndex = columnHeights.indexOf(
        Math.min(...columnHeights)
      )

      const x = shortestColumnIndex * (columnWidth + gap)
      const y = columnHeights[shortestColumnIndex]

      item.style.position = 'absolute'
      item.style.left = `${Math.min(x, containerWidth - columnWidth)}px`
      item.style.top = `${y}px`
      item.style.width = `${columnWidth}px`
      item.style.maxWidth = '100%'
      item.style.marginBottom = '0'

      columnHeights[shortestColumnIndex] += item.offsetHeight + gap
    })

    setContainerHeight(Math.max(...columnHeights))
  }, [columns, isMasonryEnabled])

  // Recalculate layout when posts change or images load
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateLayout()
    }, 100)

    return () => clearTimeout(timer)
  }, [currentPosts, calculateLayout, columns, layoutKey, isMasonryEnabled])

  const fetchPage = useCallback(
    async (targetPage: number): Promise<PageResult> => {
      if (loader) return loader(targetPage, perPage)

      const params = new URLSearchParams({
        page: String(targetPage),
        per_page: String(perPage),
      })
      if (query.authorSlug) params.set('author', query.authorSlug)
      if (query.categorySlug) params.set('category', query.categorySlug)
      if (query.tagSlug) params.set('tag', query.tagSlug)
      if (query.categoriesExclude?.length)
        params.set('exclude_categories', query.categoriesExclude.join(','))
      if (query.search) params.set('search', query.search)
      if (query.year) params.set('year', query.year)
      if (query.month) params.set('month', query.month)

      const res = await fetch(`/api/posts?${params.toString()}`)
      if (!res.ok) return null
      return (await res.json()) as { posts: BlogPost[]; totalPages: number }
    },
    [perPage, query, loader]
  )

  // Prefetch the next page whenever the current page changes (and more exists)
  useEffect(() => {
    const nextPage = page + 1
    if (nextPage > totalPages) {
      prefetchRef.current = null
      return
    }
    if (prefetchRef.current?.page === nextPage) return
    prefetchRef.current = {
      page: nextPage,
      promise: fetchPage(nextPage),
    }
  }, [page, totalPages, fetchPage])

  const showMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    const nextPage = page + 1
    setIsLoading(true)
    try {
      const cached = prefetchRef.current
      const data =
        cached?.page === nextPage
          ? await cached.promise
          : await fetchPage(nextPage)
      if (!data) return
      setPosts((prev) => [...prev, ...data.posts])
      setTotalPages(data.totalPages)
      setPage(nextPage)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page, fetchPage])

  const { ref: sentinelRef, inView: sentinelInView } = useInView({
    rootMargin: '600px 0px',
  })

  useEffect(() => {
    if (sentinelInView && hasMore && !isLoading) {
      showMore()
    }
  }, [sentinelInView, hasMore, isLoading, showMore])

  return (
    <>
      <div
        ref={containerRef}
        className={clsx('w-full max-w-4xl mx-auto', {
          'relative overflow-hidden': isMasonryEnabled,
          'space-y-8': !isMasonryEnabled,
        })}
        style={isMasonryEnabled ? { height: `${containerHeight}px` } : {}}
      >
        {currentPosts.map((post, index) => (
          <div
            key={post.slug}
            ref={(el) => {
              itemRefs.current[index] = el
              if (el && el.offsetHeight > 0 && isMasonryEnabled) {
                setTimeout(() => calculateLayout(), 50)
              }
            }}
            className={clsx('last:[&_article]:border-b-0', {
              absolute: isMasonryEnabled,
              relative: !isMasonryEnabled,
            })}
          >
            <article className="border-b border-contrast/10 pb-8 flex flex-col gap-2">
              <Link
                href={post.url}
                scroll={true}
                prefetch={true}
                className="flex flex-col gap-2 hover:text-accent transition-colors duration-300"
              >
                <Heading
                  as="h2"
                  margin="mb-0"
                >
                  {renderPostTitle(post.metadata.title ?? '')}
                </Heading>
                {post.metadata.date && (
                  <Paragraph
                    margin="mb-0"
                    fontSize="text-[0.9rem]"
                    color="text-contrast/60"
                    className="italic"
                  >
                    <time dateTime={post.metadata.date.slice(0, 10)}>
                      {DateTime.fromISO(post.metadata.date).toFormat(
                        'LLLL d, yyyy'
                      )}
                    </time>
                  </Paragraph>
                )}
                {post.metadata.featuredImage && (
                  <div className="block w-full overflow-hidden rounded-sm mt-2">
                    <Image
                      src={post.metadata.featuredImage}
                      alt={htmlToText(post.metadata.title!)}
                      size="large"
                      width={post.metadata.featuredImageWidth}
                      height={post.metadata.featuredImageHeight}
                      {...(post.metadata.featuredImageSrcSet
                        ? {
                            srcSet: post.metadata.featuredImageSrcSet,
                            sizes: IMAGE_SIZES,
                          }
                        : {})}
                      className="w-full h-auto block"
                      rounded="rounded-none"
                      lazy={index > 0}
                    />
                  </div>
                )}
                {post.metadata.description && (
                  <Paragraph
                    margin="mb-0"
                    className="line-clamp-3"
                  >
                    {post.metadata.description}
                  </Paragraph>
                )}
              </Link>
              <PostActions
                postId={post.id}
                title={htmlToText(post.metadata.title || '')}
                url={`${baseURL}${post.url}/`}
                slug={post.slug}
                skipBackfill
                {...(post.metadata.commentCount !== undefined &&
                (post.metadata.commentsOpen || post.metadata.commentCount > 0)
                  ? {
                      commentCount: post.metadata.commentCount,
                      commentsHref: `${post.url}/#comments`,
                    }
                  : {})}
                className="mt-2"
              />
            </article>
          </div>
        ))}
      </div>

      {hasMore && (
        <div
          ref={sentinelRef}
          aria-hidden={!isLoading}
        >
          {isLoading ? (
            <Paragraph textAlign="text-center">
              Loading
              <Span
                aria-hidden="true"
                className="after:content-['...'] after:animate-dots"
              />
            </Paragraph>
          ) : null}
        </div>
      )}

      {pagePath && (initialPage > 1 || hasMore) && (
        <nav
          aria-label="More posts"
          className="w-full max-w-4xl mx-auto mt-8 flex justify-between gap-4"
        >
          {/* Plain links to the pages either side, for a visitor without
              JavaScript and for search engines, which do not scroll. */}
          <Paragraph margin="mb-0">
            {initialPage > 1 && (
              <Link
                href={pageHref(pagePath, initialPage - 1)}
                rel="prev"
              >
                Newer posts
              </Link>
            )}
          </Paragraph>
          <Paragraph margin="mb-0">
            {hasMore && (
              <Link
                href={pageHref(pagePath, page + 1)}
                rel="next"
              >
                Older posts
              </Link>
            )}
          </Paragraph>
        </nav>
      )}

      <AsyncSidebarRenderer />
    </>
  )
}

// A listing's address at one of its pages: the first has no number.
function pageHref(path: string, page: number) {
  return page <= 1 ? path : `${path}?page=${page}`
}

// Main exported component with provider wrapper
export function BlogClient({
  initialPosts = [],
  initialTotalPages = 1,
  initialPage = 1,
  perPage = 15,
  query = {},
  pagePath,
  loader,
}: {
  initialPosts?: BlogPost[]
  initialTotalPages?: number
  // The page of the listing initialPosts is, when the address asked for one.
  initialPage?: number
  perPage?: number
  query?: BlogQuery
  // The listing's own address ("/category/hiring/"), for links to its pages.
  pagePath?: string
  loader?: (
    page: number,
    perPage: number
  ) => Promise<{ posts: BlogPost[]; totalPages: number } | null>
}) {
  return (
    <SidebarStackProvider>
      <BlogClientInner
        initialPosts={initialPosts}
        initialTotalPages={initialTotalPages}
        initialPage={initialPage}
        perPage={perPage}
        query={query}
        {...(pagePath ? { pagePath } : {})}
        {...(loader ? { loader } : {})}
      />
    </SidebarStackProvider>
  )
}
