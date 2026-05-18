'use client'

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useInView } from 'react-intersection-observer'
import { Heading } from '@/components/heading'
import { Image } from '@/components/image'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import { PostActions } from '@/components/post-actions'
import { baseURL } from '@/app/metadata'
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
  }
  shareCount?: number
  likeCount?: number
}

export interface BlogQuery {
  authorSlug?: string
  categorySlug?: string
  tagSlug?: string
  categoriesExclude?: string[]
  search?: string
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

const getCacheKey = (query: BlogQuery) =>
  JSON.stringify({
    a: query.authorSlug ?? '',
    c: query.categorySlug ?? '',
    t: query.tagSlug ?? '',
    e: query.categoriesExclude ?? [],
    s: query.search ?? '',
  })

interface BlogClientInnerProps {
  initialPosts: BlogPost[]
  initialTotalPages: number
  perPage: number
  query: BlogQuery
  loader?: (page: number, perPage: number) => Promise<PageResult>
}

// Inner component that uses the sidebar stack context
function BlogClientInner({
  initialPosts,
  initialTotalPages,
  perPage,
  query,
  loader,
}: BlogClientInnerProps) {
  const cacheKey = getCacheKey(query)
  const cached =
    typeof window !== 'undefined' ? blogCache.get(cacheKey) : undefined
  const [posts, setPosts] = useState<BlogPost[]>(cached?.posts ?? initialPosts)
  const [page, setPage] = useState(cached?.page ?? 1)
  const [totalPages, setTotalPages] = useState(
    cached?.totalPages ?? initialTotalPages
  )

  useEffect(() => {
    blogCache.set(cacheKey, {
      posts,
      page,
      totalPages,
      scrollY: blogCache.get(cacheKey)?.scrollY ?? 0,
    })
  }, [cacheKey, posts, page, totalPages])

  useEffect(() => {
    const missingPostIds = posts
      .map((p) => p.id)
      .filter(
        (id) =>
          state.likeCounts[id] === undefined || state.liked[id] === undefined
      )
    const missingSlugs = posts
      .map((p) => p.slug)
      .filter((slug) => state.shareCounts[slug] === undefined)

    let cancelled = false

    if (missingPostIds.length > 0) {
      const anonId = getOrCreateAnonId()
      const params = new URLSearchParams({
        postIds: missingPostIds.join(','),
        anonId,
      })
      fetch(`/api/blog-likes?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return
          for (const id of missingPostIds) {
            if (state.likeCounts[id] === undefined) {
              state.likeCounts[id] = data.counts?.[id] ?? 0
            }
            if (state.liked[id] === undefined) {
              state.liked[id] = Boolean(data.liked?.[id])
            }
          }
        })
        .catch(() => {})
    }

    if (missingSlugs.length > 0) {
      const params = new URLSearchParams({ slugs: missingSlugs.join(',') })
      fetch(`/api/share-count?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return
          for (const slug of missingSlugs) {
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
          'space-y-6': !isMasonryEnabled,
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
              className={clsx(
                'last:[&_article]:border-b-0',
                {
                  absolute: isMasonryEnabled,
                  relative: !isMasonryEnabled,
                }
              )}
            >
              <article className="border-b border-contrast/10 pb-8 flex flex-col gap-2">
                <Link
                  href={post.url}
                  scroll={true}
                  prefetch={true}
                  className="flex flex-col gap-2 hover:text-accent transition-colors duration-300"
                >
                  <Heading as="h2" margin="mb-0">
                    {post.metadata.title}
                  </Heading>
                  {post.metadata.description && (
                    <Paragraph
                      margin="mb-0"
                      className="line-clamp-3"
                    >
                      {post.metadata.description}
                    </Paragraph>
                  )}
                  {post.metadata.featuredImage && (
                    <div className="block w-full overflow-hidden rounded-sm mt-2">
                      <Image
                        src={post.metadata.featuredImage}
                        alt={post.metadata.title!}
                        size="large"
                        width={post.metadata.featuredImageWidth}
                        height={post.metadata.featuredImageHeight}
                        className="w-full h-auto block"
                        rounded="rounded-none"
                      />
                    </div>
                  )}
                </Link>
                <PostActions
                  postId={post.id}
                  title={post.metadata.title || ''}
                  url={`${baseURL}${post.url}/`}
                  slug={post.slug}
                  skipBackfill
                  className="mt-2"
                />
              </article>
            </div>
          ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} aria-hidden={!isLoading}>
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

      <AsyncSidebarRenderer />
    </>
  )
}

// Main exported component with provider wrapper
export function BlogClient({
  initialPosts = [],
  initialTotalPages = 1,
  perPage = 15,
  query = {},
  loader,
}: {
  initialPosts?: BlogPost[]
  initialTotalPages?: number
  perPage?: number
  query?: BlogQuery
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
        perPage={perPage}
        query={query}
        {...(loader ? { loader } : {})}
      />
    </SidebarStackProvider>
  )
}
