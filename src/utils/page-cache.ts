import { DateTime } from 'luxon'

// Every page the site builds (the home page, the archives, a post, and the
// payload a link prefetches) is kept for a day in the Cache API, so the
// Worker builds each one once per location instead of on every visit, the
// way a CDN keeps a static page at its edge. KV was tried as the store
// (2026-10-07) and dropped: it keeps a value at a location for only a
// minute after a read, so on a quiet site nearly every hit went to the
// central store and cost as much as a render. The post's rule
// applies: a page is kept 24 hours, and cleared by Sync, Revalidate and
// Clear cache, and when a comment is posted through the site, and by a
// deploy (cf:clear-pages in package.json), which the Cache API would not
// notice by itself. An expired copy is still served, and rebuilt behind the
// visitor, so nobody waits for a page that merely aged out. A cleared copy
// is not: it is rebuilt in front of the first visitor, so the administrator
// who pressed Sync, Revalidate or Clear cache sees the result on the reload
// that follows, as does a visitor who has just posted a comment.
//
// A clear is a write of the time, in POST_CACHE beside the posts' own
// meta:cleared-at. A copy built before that time is not served. The Cache API
// is kept in each Cloudflare location separately, so the first visit at each
// location builds the page there.
//
// Pages are cleared by tag, so an edit leaves the rest of the cache warm.
// Every page carries the `site` tag (meta:pages-cleared-at, which Clear cache
// and a deploy write) and one of its own: a post's, a WordPress page's, or
// `lists` for every page that shows posts' titles (home, archives, year,
// month, category, tag, author, search). A change to a post or a page
// writes its own tag and `lists`. A copy is served only if it was built
// after every marker of its tags.
//
// This file is also bundled outside Next.js, by worker.ts, so it imports
// nothing that only exists inside a request to the site.

export const PAGES_CLEARED_AT_KEY = 'meta:pages-cleared-at'

export const SITE_TAG = 'site'
export const LISTS_TAG = 'lists'

const POST_PATH = /^\/(\d{4})\/(\d{2})\/([^/]+)\/?$/
const DATE_PATH = /^\/\d{4}(\/\d{2})?\/?$/
const LIST_PATH = /^\/(archives|category|tag|author|search)(\/|$)/

const MAX_AGE_MS = 24 * 60 * 60 * 1000

// How long the Cache API holds a copy. Whether a copy is fresh is decided by
// when it was built, not by this; a week keeps a stale copy findable so it
// can be served while it is rebuilt.
const KEEP_SECONDS = 7 * 24 * 60 * 60

const BUILT_HEADER = 'X-Page-Built'
const STATE_HEADER = 'X-Page-Cache'
// Next's own Cache-Control, put back when the copy is served so a browser
// never keeps it.
const ORIGINAL_CACHE_CONTROL_HEADER = 'X-Page-Cache-Control'

export type PageCacheKv = {
  get(key: string, type: 'json'): Promise<unknown>
  put(key: string, value: string): Promise<void>
}

type Cache = {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
  delete(request: Request): Promise<boolean>
}

type Context = { waitUntil(promise: Promise<unknown>): void }

// The tag of the page at a path (or a full URL): a post's own, `lists` for a
// list, or a WordPress page's own. A query string does not change it.
export function pageTag(pathOrUrl: string): string {
  let path = pathOrUrl
  if (/^https?:\/\//.test(path)) path = new URL(path).pathname
  path = path.split('?')[0] ?? ''
  const post = path.match(POST_PATH)
  if (post) return `post:${post[1]}/${post[2]}/${decodeURIComponent(post[3]!)}`
  if (path === '/' || DATE_PATH.test(path) || LIST_PATH.test(path)) {
    return LISTS_TAG
  }
  return `page:${path.replace(/\/+$/, '') || '/'}`
}

function markerKey(tag: string): string {
  return tag === SITE_TAG ? PAGES_CLEARED_AT_KEY : `meta:pages-cleared:${tag}`
}

// Clears the pages with any of these tags; with none given, every page.
export async function clearPages(
  kv: PageCacheKv,
  tags: string[] = [SITE_TAG]
): Promise<void> {
  const now = JSON.stringify(DateTime.now().toMillis())
  await Promise.all(
    Array.from(new Set(tags)).map((tag) => kv.put(markerKey(tag), now))
  )
}

// The tags to clear when the content at a path changed: its own page, and
// the lists its title or count is on.
export function tagsChangedAt(paths: string[]): string[] {
  return Array.from(new Set([...paths.map(pageTag), LISTS_TAG]))
}

// A request for a page as a visitor or a link's prefetch asks for it. Files,
// the API and Next's own assets are not pages, and a query string other than
// a page number or Next's _rsc (a hash of the router's headers, so the URL
// alone says which payload it is) is rendered as it always was.
function isPageRequest(request: Request): boolean {
  if (request.method !== 'GET') return false
  const url = new URL(request.url)
  const path = url.pathname
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    path.startsWith('/cdn-cgi/') ||
    /\.[a-z0-9]+$/i.test(path)
  ) {
    return false
  }
  for (const [key, value] of url.searchParams) {
    if (key === 'page' && /^\d{1,5}$/.test(value)) continue
    if (key === '_rsc' && value) continue
    return false
  }
  // A payload asked for without the _rsc that names it would be kept under
  // the page's own address.
  if (request.headers.get('RSC') && !url.searchParams.has('_rsc')) return false
  return true
}

function storable(response: Response): boolean {
  const type = response.headers.get('Content-Type') ?? ''
  return (
    response.status === 200 &&
    (type.startsWith('text/html') || type.startsWith('text/x-component')) &&
    !response.headers.has('Set-Cookie')
  )
}

// `builtAt` is when the render began, not ended: a clear during the render
// must count against the copy it produces.
async function store(
  cache: Cache,
  key: Request,
  response: Response,
  builtAt: number
) {
  const headers = new Headers(response.headers)
  headers.set(
    ORIGINAL_CACHE_CONTROL_HEADER,
    response.headers.get('Cache-Control') ?? 'no-store'
  )
  headers.set('Cache-Control', `public, max-age=${KEEP_SECONDS}`)
  headers.set(BUILT_HEADER, String(builtAt))
  await cache.put(key, new Response(response.body, { status: 200, headers }))
}

async function rebuild(
  cache: Cache,
  key: Request,
  render: () => Promise<Response>
) {
  try {
    const builtAt = DateTime.now().toMillis()
    const response = await render()
    // A page that is gone, or redirects now, must not go on being served.
    if (storable(response)) await store(cache, key, response, builtAt)
    else await cache.delete(key)
  } catch (error) {
    console.error('A page was not rebuilt:', error)
  }
}

// The copy as the visitor gets it: Next's headers, and which this was.
function serve(copy: Response, state: 'HIT' | 'STALE'): Response {
  const headers = new Headers(copy.headers)
  headers.set(
    'Cache-Control',
    headers.get(ORIGINAL_CACHE_CONTROL_HEADER) ?? 'no-store'
  )
  headers.delete(ORIGINAL_CACHE_CONTROL_HEADER)
  headers.set(STATE_HEADER, state)
  return new Response(copy.body, { status: copy.status, headers })
}

export async function cachedPage(
  request: Request,
  env: { POST_CACHE?: PageCacheKv },
  ctx: Context,
  render: () => Promise<Response>
): Promise<Response> {
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default
  const kv = env.POST_CACHE
  if (!cache || !kv || !isPageRequest(request)) return render()

  const key = new Request(request.url, { method: 'GET' })
  const tags = [SITE_TAG, pageTag(new URL(request.url).pathname)]
  // Each read fails on its own: a copy is still served when a time cannot
  // be read, and the page is still built when the copy cannot.
  const [copy, ...clearedAts] = await Promise.all([
    cache.match(key).catch((error: unknown) => {
      console.error('Page cache read failed:', error)
      return undefined
    }),
    ...tags.map((tag) =>
      kv
        .get(markerKey(tag), 'json')
        .then((cleared) => (typeof cleared === 'number' ? cleared : 0))
        .catch((error: unknown) => {
          console.error('Page cache cleared-at read failed:', error)
          return 0
        })
    ),
  ])
  const clearedAt = Math.max(0, ...clearedAts)

  // A copy built before the last clear falls through and is rebuilt now.
  if (copy && Number(copy.headers.get(BUILT_HEADER)) >= clearedAt) {
    const builtAt = Number(copy.headers.get(BUILT_HEADER))
    const fresh = DateTime.now().toMillis() - builtAt < MAX_AGE_MS
    if (!fresh) ctx.waitUntil(rebuild(cache, key, render))
    return serve(copy, fresh ? 'HIT' : 'STALE')
  }

  const builtAt = DateTime.now().toMillis()
  const response = await render()
  if (!storable(response)) return response

  ctx.waitUntil(store(cache, key, response.clone(), builtAt))
  const headers = new Headers(response.headers)
  headers.set(STATE_HEADER, 'MISS')
  return new Response(response.body, { status: response.status, headers })
}
