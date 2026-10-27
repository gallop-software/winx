import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { DateTime } from 'luxon'
import { clearPages, tagsChangedAt } from '@/utils/page-cache'
import { normalizePostUrl } from '@/utils/post-url'

// What the Gallop plugin passes on from WordPress's SEO plugin (Yoast) for a
// post. An empty object when no SEO plugin is active; a value is null or ''
// where the plugin has nothing of its own. Read through resolvePostSeo() in
// src/utils/post-seo.ts.
export type PostSeoData = {
  title?: string | null
  metaDesc?: string | null
  canonical?: string | null
  metaRobotsNoindex?: unknown
  metaRobotsNoFollow?: unknown
  opengraphTitle?: string | null
  opengraphDescription?: string | null
  opengraphUrl?: string | null
  opengraphImage?: {
    mediaItemUrl?: string | null
    mediaDetails?: { width?: number | null; height?: number | null }
  } | null
}

// What WordPress returns for one post or page from gallop/v1/post. The
// post's fields are whatever the plugin sends, so they are not typed here.
export type PostData = {
  post: Record<string, any>
  seo?: PostSeoData
  site?: {
    author?: { displayName?: string; userUrl?: string; description?: string }
    siteTitle?: string
  }
}

type CacheEntry = { data: PostData; fetchedAt: number }

// The POST_CACHE binding from wrangler.jsonc, typed here for the same reason
// as the DB binding in src/utils/prisma.ts.
type PostCache = {
  get(key: string, type: 'json'): Promise<unknown>
  put(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

// Most posts never change, so a cached post is only checked against
// WordPress once a day. Revalidate refreshes one post immediately.
export const MAX_AGE_MS = 24 * 60 * 60 * 1000

// Clear Cache writes the current time here. Every entry fetched before it is
// treated as missing, which clears all posts with a single write.
const CLEARED_AT_KEY = 'meta:cleared-at'

function getCache(): PostCache | undefined {
  try {
    const env = getCloudflareContext().env as unknown as {
      POST_CACHE?: PostCache
    }
    return env.POST_CACHE
  } catch {
    return undefined
  }
}

function postKey(slug: string, year: string, month: string) {
  let decoded = slug
  try {
    decoded = decodeURIComponent(slug)
  } catch {
    // Not valid percent-encoding: use the slug as given.
  }
  return `post:${year}/${month}/${decoded}`
}

function pageKey(path: string) {
  return `page:${normalizePostUrl(path) || '/'}`
}

function wpJsonUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_WORDPRESS_URL
    ? `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json`
    : undefined
}

// A refused or failed WordPress request is an error, not a missing post, so
// the visitor sees the error page instead of a misleading 404.
function assertOk(res: Response, url: string) {
  if (!res.ok && res.status !== 404) {
    throw new Error(`WordPress returned ${res.status} for ${url}`)
  }
}

async function fetchPostFromWordPress(
  slug: string,
  year: string,
  month: string
): Promise<PostData | null> {
  const wpJson = wpJsonUrl()
  if (!wpJson) return null

  const linkUrl = `${wpJson}/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=link`
  const linkRes = await fetch(linkUrl, { cache: 'no-store' })
  assertOk(linkRes, linkUrl)
  if (!linkRes.ok) return null

  const posts = await linkRes.json()
  if (!Array.isArray(posts) || !posts.length) return null

  const match = posts.find((p: { link?: string }) => {
    if (!p.link) return false
    const m = new URL(p.link).pathname.match(/^\/(\d{4})\/(\d{2})\//)
    return m && m[1] === year && m[2] === month
  })
  if (!match?.link) return null

  // The Gallop endpoint matches the decoded path, so a slug with non-ASCII
  // characters (l’elisir-d’amore) is not found in its percent-encoded form.
  return fetchByUri(wpJson, decodeURI(new URL(match.link).pathname))
}

// Asks the Gallop plugin for what is published at a path: a post or a page,
// nested or not. Null when nothing is.
async function fetchByUri(
  wpJson: string,
  uri: string
): Promise<PostData | null> {
  const gallopUrl = `${wpJson}/gallop/v1/post/`
  const res = await fetch(gallopUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uri }),
    cache: 'no-store',
  })

  assertOk(res, gallopUrl)
  if (!res.ok) return null

  const data = await res.json()
  if (!data.post) return null

  return data
}

// A WordPress page by its path. The plugin resolves the path itself, so a
// page under another (/guides/hiring) is found the same way.
// Anything else at the path, such as a post, is not a page.
async function fetchPageFromWordPress(path: string): Promise<PostData | null> {
  const wpJson = wpJsonUrl()
  if (!wpJson) return null
  const wanted = normalizePostUrl(path) || '/'
  const data = await fetchByUri(wpJson, `${decodeURI(wanted)}/`)
  if (!data || data.post.postType !== 'page') return null
  // The plugin may answer a near miss with the page it resolved to; only
  // the page at this very path is this page.
  const uri = typeof data.post.uri === 'string' ? data.post.uri : ''
  if (uri && normalizePostUrl(uri) !== wanted) return null
  return data
}

// --- The cache ---

type Fetcher = () => Promise<PostData | null>

// Fetches from WordPress and replaces the cached copy under `key`. What
// WordPress no longer has is removed from the cache rather than stored.
async function refreshKey(
  key: string,
  fetcher: Fetcher
): Promise<PostData | null> {
  const data = await fetcher()
  const kv = getCache()
  if (!kv) return data

  if (data) {
    const entry: CacheEntry = { data, fetchedAt: DateTime.now().toMillis() }
    await kv.put(key, JSON.stringify(entry))
  } else {
    await kv.delete(key)
  }
  return data
}

// The cached copy under `key`, fetched when there is none, fetched again
// when Clear Cache was pressed since, and refreshed behind the visitor once
// a day.
async function cachedKey(
  key: string,
  fetcher: Fetcher
): Promise<PostData | null> {
  const kv = getCache()
  if (!kv) return fetcher()

  let entry: CacheEntry | null = null
  let clearedAt = 0
  try {
    const [cached, cleared] = await Promise.all([
      kv.get(key, 'json'),
      kv.get(CLEARED_AT_KEY, 'json'),
    ])
    entry = cached as CacheEntry | null
    clearedAt = typeof cleared === 'number' ? cleared : 0
  } catch (error) {
    console.error('Post cache read failed:', error)
  }

  if (!entry?.data) return refreshKey(key, fetcher)

  if (entry.fetchedAt <= clearedAt) {
    // Cleared: fetch a fresh copy now. If WordPress refuses or fails, the old
    // copy is better than an error page.
    try {
      return await refreshKey(key, fetcher)
    } catch (error) {
      console.error('Post cache refresh failed:', error)
      return entry.data
    }
  }

  if (DateTime.now().toMillis() - entry.fetchedAt > MAX_AGE_MS) {
    // Serve the copy we have and update it behind the visitor. If WordPress
    // refuses or fails, the old copy stays in place.
    getCloudflareContext().ctx.waitUntil(
      refreshKey(key, fetcher).catch((error) => {
        console.error('Post cache refresh failed:', error)
      })
    )
  }

  return entry.data
}

async function deleteKey(key: string): Promise<void> {
  const kv = getCache()
  if (!kv) return
  await kv.delete(key)
}

// Fetches the post from WordPress and replaces its cached copy. A post that
// WordPress no longer has is removed from the cache rather than stored.
export function refreshPost(
  slug: string,
  year: string,
  month: string
): Promise<PostData | null> {
  return refreshKey(postKey(slug, year, month), () =>
    fetchPostFromWordPress(slug, year, month)
  )
}

export function getPost(
  slug: string,
  year: string,
  month: string
): Promise<PostData | null> {
  return cachedKey(postKey(slug, year, month), () =>
    fetchPostFromWordPress(slug, year, month)
  )
}

// Removes one post's cached copy, so its next view asks WordPress. Used when
// a post has changed or is no longer published.
export function deleteCachedPost(
  slug: string,
  year: string,
  month: string
): Promise<void> {
  return deleteKey(postKey(slug, year, month))
}

// A WordPress page's body and SEO, cached like a post's. The content index
// says which paths are pages (src/utils/pages.ts); this fetches the one at
// the path.
export function getWordPressPage(path: string): Promise<PostData | null> {
  return cachedKey(pageKey(path), () => fetchPageFromWordPress(path))
}

export function refreshWordPressPage(path: string): Promise<PostData | null> {
  return refreshKey(pageKey(path), () => fetchPageFromWordPress(path))
}

export function deleteCachedPage(path: string): Promise<void> {
  return deleteKey(pageKey(path))
}

// When Clear Cache was last pressed, in milliseconds, or 0 if it never was.
// Anything else kept in the same store treats what it fetched before then as
// missing, so the one button clears it too.
export async function getClearedAt(): Promise<number> {
  const kv = getCache()
  if (!kv) return 0
  try {
    const cleared = await kv.get(CLEARED_AT_KEY, 'json')
    return typeof cleared === 'number' ? cleared : 0
  } catch {
    return 0
  }
}

// Marks every kept page as cleared, so each is rebuilt for its next visitor.
// For Clear cache and a rebuild: see src/utils/page-cache.ts.
export async function clearPagesNow(): Promise<void> {
  const kv = getCache()
  if (kv) await clearPages(kv)
}

// Builds the pages at these paths now, at this location, by asking the
// Worker for them through its own binding, so the admin's refresh after
// Revalidate finds them in the page cache instead of waiting for a render.
// The markers were just written here, so each request renders afresh. A
// page that fails to build is logged; its next visitor builds it.
export async function warmPages(
  origin: string,
  paths: string[]
): Promise<void> {
  let self: { fetch(request: Request): Promise<Response> } | undefined
  try {
    const env = getCloudflareContext().env as unknown as {
      WORKER_SELF_REFERENCE?: { fetch(request: Request): Promise<Response> }
    }
    self = env.WORKER_SELF_REFERENCE
  } catch {
    return
  }
  if (!self) return
  for (const path of paths) {
    try {
      const response = await self.fetch(new Request(new URL(path, origin)))
      await response.arrayBuffer()
    } catch (error) {
      console.error('A page was not warmed:', path, error)
    }
  }
}

// Marks the pages at these paths and every list as cleared, leaving the
// rest of the cache warm. Called wherever a post, a page or its comments
// change. Many paths at once, as a Sync can bring, is simply everything.
export async function clearPagesAt(paths: string[]): Promise<void> {
  const kv = getCache()
  if (!kv) return
  if (paths.length > 50) await clearPages(kv)
  else await clearPages(kv, tagsChangedAt(paths))
}

// Returns false when there is no cache to clear.
export async function clearAllPosts(): Promise<boolean> {
  const kv = getCache()
  if (!kv) return false
  await kv.put(CLEARED_AT_KEY, JSON.stringify(DateTime.now().toMillis()))
  return true
}
