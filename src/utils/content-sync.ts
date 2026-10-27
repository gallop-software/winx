import 'server-only'
import { DateTime } from 'luxon'
import { getDb, type D1, type D1Statement } from '@/utils/d1'
import { fetchWordPress } from '@/utils/wp-fetch'
import { decodeEntities, htmlToText } from '@/utils/html-text'
import { decodeSlug, normalizePostUrl, parsePostUrl } from '@/utils/post-url'
import { clearComments } from '@/utils/comments'
import {
  deleteCachedPage,
  deleteCachedPost,
  refreshPost,
  refreshWordPressPage,
} from '@/utils/post-cache'

// Copies what WordPress has published into the content index in D1. Two ways
// in: syncChanged() picks up what changed since the last run, and a rebuild
// reads every post again and then removes what WordPress no longer has.
//
// WordPress is asked one request at a time, and a rebuild is split into one
// call per page that the browser makes in turn, so no single request to the
// Worker has to read all of WordPress.

const POSTS_PER_PAGE = 20
const TERMS_PER_PAGE = 100
const POST_FIELDS =
  'id,slug,link,title,excerpt,content,date,date_gmt,modified,modified_gmt,author,comment_status,yoast_head_json,_links,_embedded'
const POST_EMBED = 'wp:featuredmedia,wp:term,author'

// Pages are few, so every run reads all of them.
const PAGES_PER_PAGE = 100
const PAGE_FIELDS =
  'id,slug,link,parent,menu_order,title,excerpt,modified_gmt,content.protected,yoast_head_json'

// A post's statements are kept in one batch so it is written whole or not at
// all. Five statements a post, ten posts a batch.
const POSTS_PER_BATCH = 10

// How far before the last change seen to ask WordPress again. Covers posts
// saved in the same second and the hour repeated when daylight saving ends.
// Posts that come back unchanged are skipped.
const OVERLAP_HOURS = 2

// A scheduled post keeps its old modified time when it goes live, so asking
// for what changed does not find it. The newest posts are checked as well.
const NEWEST_SCAN = 20

const MAX_BODY_LENGTH = 500000

// Comment counts come from WordPress's list of approved comments, which says
// only which post each is on. A rebuild reads all of it. Sync reads the
// comments of the last month, generously, and counts the posts they are on
// again: a comment approved long after it was written is caught by the next
// rebuild, or when its post's comments are read.
const COMMENTS_PER_PAGE = 100
const COMMENT_OVERLAP_DAYS = 30

// A rebuild that would remove more than this many posts, or more than this
// share of them, stops and asks first.
const STALE_LIMIT = 25
const STALE_SHARE = 0.05

type WpTerm = {
  id?: unknown
  name?: unknown
  slug?: unknown
  taxonomy?: unknown
}

// What the SEO plugin adds to a post, term or user. Absent without the plugin.
type WpSeo = {
  title?: unknown
  description?: unknown
  robots?: { index?: unknown }
}

type IndexedSeo = { seoTitle: string; seoDescription: string; noindex: number }

// The plugin's title and description, and whether it keeps the page out of
// search engines. The description is only there when someone wrote one.
function readSeo(seo: WpSeo | undefined): IndexedSeo {
  return {
    seoTitle:
      typeof seo?.title === 'string' ? decodeEntities(seo.title).trim() : '',
    seoDescription:
      typeof seo?.description === 'string'
        ? decodeEntities(seo.description).trim()
        : '',
    noindex: seo?.robots?.index === 'noindex' ? 1 : 0,
  }
}

type WpAvatars = Record<string, unknown>

// The largest picture WordPress offers for a user.
function readAvatar(avatars: WpAvatars | undefined): string {
  const sizes = Object.keys(avatars ?? {})
    .map(Number)
    .filter(Boolean)
    .sort((a, b) => b - a)
  const url = sizes.length ? avatars?.[String(sizes[0])] : ''
  return typeof url === 'string' ? url : ''
}

type WpPost = {
  id: number
  slug: string
  link?: string
  date?: string
  date_gmt?: string
  modified?: string
  modified_gmt?: string
  author?: number
  comment_status?: string
  title?: { rendered?: string }
  excerpt?: { rendered?: string }
  content?: { rendered?: string }
  yoast_head_json?: WpSeo
  _embedded?: {
    author?: {
      id?: unknown
      name?: unknown
      slug?: unknown
      description?: unknown
      url?: unknown
      avatar_urls?: WpAvatars
    }[]
    'wp:featuredmedia'?: {
      source_url?: string
      media_details?: {
        width?: number | string
        height?: number | string
        sizes?: Record<
          string,
          {
            source_url?: string
            width?: number | string
            height?: number | string
          }
        >
      }
    }[]
    'wp:term'?: WpTerm[][]
  }
}

type Taxonomy = 'category' | 'post_tag'

type IndexedTerm = {
  id: number
  taxonomy: Taxonomy
  slug: string
  name: string
  description?: string
} & Partial<IndexedSeo>

type IndexedAuthor = {
  id: number
  slug: string
  name: string
  description: string
  avatar: string
  url: string
} & Partial<IndexedSeo>

type IndexedPost = {
  id: number
  slug: string
  url: string
  title: string
  description: string
  date: string
  dateGmt: string
  modified: string
  modifiedGmt: string
  featuredImage: string
  featuredImageWidth: number | null
  featuredImageHeight: number | null
  featuredImageSizes: string | null
  authorId: number
  author: IndexedAuthor | null
  terms: IndexedTerm[]
  body: string
  commentsOpen: boolean
} & IndexedSeo

type WpPage = {
  id: number
  slug: string
  link?: string
  parent?: number
  menu_order?: number
  modified_gmt?: string
  title?: { rendered?: string }
  excerpt?: { rendered?: string }
  content?: { protected?: boolean }
  yoast_head_json?: WpSeo
}

type IndexedPage = {
  id: number
  slug: string
  path: string
  parentId: number
  menuOrder: number
  title: string
  description: string
  modifiedGmt: string
} & IndexedSeo

export type SyncCursor = { modifiedAfter: string; page: number }

export type SyncedPost = { title: string; url: string }

export type SyncResult = {
  done: boolean
  // Where the next call should continue from, when done is false.
  cursor: SyncCursor | null
  // The index has never been filled, so there is nothing to compare against.
  needsRebuild: boolean
  updated: SyncedPost[]
  // How many posts WordPress has and how many the index has. More in the
  // index means posts were removed in WordPress: a rebuild clears them.
  wpTotal: number | null
  indexTotal: number
}

export type RebuildStart = {
  runId: number
  total: number
  totalPages: number
  perPage: number
}

export type RebuildKind = Taxonomy | 'author'

export type FinishResult =
  | { finished: true; removed: number; posts: number }
  | {
      finished: false
      reason: 'incomplete' | 'confirm'
      // Posts the rebuild read, and posts WordPress reports.
      seen: number
      wpTotal: number
      // Posts that would be removed.
      stale: number
    }

export type SyncStatus = {
  posts: number
  generation: number
  lastSyncedAt: string | null
  lastRebuildAt: string | null
}

function isTaxonomy(value: unknown): value is Taxonomy {
  return value === 'category' || value === 'post_tag'
}

type WpFeaturedMedia = NonNullable<
  NonNullable<WpPost['_embedded']>['wp:featuredmedia']
>[number]

// The copies of a featured image that keep its shape, narrowest first, then
// the original. WordPress also keeps copies cropped to a fixed shape, which
// would not fit the width and height the lists reserve for the image.
function featuredImageSizes(
  featured: WpFeaturedMedia | undefined
): string | null {
  const url = featured?.source_url
  const width = Number(featured?.media_details?.width)
  const height = Number(featured?.media_details?.height)
  if (!url || !width || !height) return null

  const byWidth = new Map<number, string>()
  for (const size of Object.values(featured?.media_details?.sizes ?? {})) {
    const w = Number(size?.width)
    const h = Number(size?.height)
    if (!size?.source_url || !w || !h || w >= width) continue
    // WordPress rounds the height, so allow a pixel either way.
    if (Math.abs(h - (w * height) / width) > 1) continue
    byWidth.set(w, size.source_url)
  }
  if (byWidth.size === 0) return null

  const sizes = [...byWidth]
    .sort(([a], [b]) => a - b)
    .map(([w, source]) => ({ url: source, w }))
  sizes.push({ url, w: width })
  return JSON.stringify(sizes)
}

function mapPost(raw: WpPost): IndexedPost | null {
  if (typeof raw.id !== 'number' || !raw.link || !raw.slug) return null

  const featured = raw._embedded?.['wp:featuredmedia']?.[0]
  const embeddedAuthor = raw._embedded?.author?.[0]
  const author: IndexedAuthor | null =
    typeof embeddedAuthor?.id === 'number' &&
    typeof embeddedAuthor.slug === 'string' &&
    embeddedAuthor.slug
      ? {
          id: embeddedAuthor.id,
          slug: embeddedAuthor.slug,
          name: decodeEntities(String(embeddedAuthor.name ?? '')),
          description: decodeEntities(String(embeddedAuthor.description ?? '')),
          avatar: readAvatar(embeddedAuthor.avatar_urls),
          url: typeof embeddedAuthor.url === 'string' ? embeddedAuthor.url : '',
        }
      : null

  const terms: IndexedTerm[] = []
  const termIds = new Set<number>()
  for (const group of raw._embedded?.['wp:term'] ?? []) {
    if (!Array.isArray(group)) continue
    for (const term of group) {
      if (typeof term.id !== 'number' || typeof term.slug !== 'string') continue
      if (!isTaxonomy(term.taxonomy) || termIds.has(term.id)) continue
      termIds.add(term.id)
      terms.push({
        id: term.id,
        taxonomy: term.taxonomy,
        slug: term.slug,
        name: decodeEntities(String(term.name ?? '')),
      })
    }
  }

  return {
    id: raw.id,
    slug: raw.slug,
    url: normalizePostUrl(new URL(raw.link).pathname),
    title: decodeEntities(raw.title?.rendered ?? ''),
    description: decodeEntities(
      (raw.excerpt?.rendered ?? '').replace(/<[^>]*>/g, '').trim()
    ),
    date: raw.date ?? '',
    dateGmt: raw.date_gmt ?? '',
    modified: raw.modified ?? '',
    modifiedGmt: raw.modified_gmt ?? '',
    featuredImage: featured?.source_url ?? '',
    // WordPress sends these as text for some older images.
    featuredImageWidth: Number(featured?.media_details?.width) || null,
    featuredImageHeight: Number(featured?.media_details?.height) || null,
    featuredImageSizes: featuredImageSizes(featured),
    authorId: author?.id ?? 0,
    author,
    terms,
    body: htmlToText(raw.content?.rendered ?? '', MAX_BODY_LENGTH),
    commentsOpen: raw.comment_status !== 'closed',
    ...readSeo(raw.yoast_head_json),
  }
}

// --- WordPress ---

async function readJson<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) throw new Error(`WordPress returned ${res.status} for ${what}`)
  return (await res.json()) as T
}

type PostPage = { posts: IndexedPost[]; total: number; totalPages: number }

async function fetchPosts(params: Record<string, string>): Promise<PostPage> {
  const res = await fetchWordPress('/wp/v2/posts', {
    _embed: POST_EMBED,
    _fields: POST_FIELDS,
    ...params,
  })

  // Asking for a page past the last one is an error in WordPress, and
  // happens when posts are removed while their pages are being read.
  if (res.status === 400 && Number(params.page ?? '1') > 1) {
    return { posts: [], total: 0, totalPages: 0 }
  }

  const raw = await readJson<WpPost[]>(res, 'posts')
  const posts: IndexedPost[] = []
  for (const item of Array.isArray(raw) ? raw : []) {
    const post = mapPost(item)
    if (post) posts.push(post)
  }

  return {
    posts,
    total: Number(res.headers.get('X-WP-Total') ?? '0'),
    totalPages: Number(res.headers.get('X-WP-TotalPages') ?? '0'),
  }
}

// A page behind a password is not shown: WordPress keeps its content from
// the site, so it is left out of the index rather than listed as a page
// that cannot be read.
function mapPage(raw: WpPage): IndexedPage | null {
  if (typeof raw.id !== 'number' || !raw.link || !raw.slug) return null
  if (raw.content?.protected) return null
  return {
    id: raw.id,
    slug: raw.slug,
    path: normalizePostUrl(new URL(raw.link).pathname) || '/',
    parentId: Number(raw.parent) || 0,
    menuOrder: Number(raw.menu_order) || 0,
    title: decodeEntities(raw.title?.rendered ?? ''),
    description: decodeEntities(
      (raw.excerpt?.rendered ?? '').replace(/<[^>]*>/g, '').trim()
    ),
    modifiedGmt: raw.modified_gmt ?? '',
    ...readSeo(raw.yoast_head_json),
  }
}

// One page of the published pages, by id.
async function fetchPages(
  page: number
): Promise<{ pages: IndexedPage[]; totalPages: number }> {
  const res = await fetchWordPress('/wp/v2/pages', {
    _fields: PAGE_FIELDS,
    orderby: 'id',
    order: 'asc',
    per_page: String(PAGES_PER_PAGE),
    page: String(page),
  })
  if (res.status === 400 && page > 1) return { pages: [], totalPages: 0 }

  const raw = await readJson<WpPage[]>(res, 'pages')
  const pages: IndexedPage[] = []
  for (const item of Array.isArray(raw) ? raw : []) {
    const mapped = mapPage(item)
    if (mapped) pages.push(mapped)
  }
  return {
    pages,
    totalPages: Number(res.headers.get('X-WP-TotalPages') ?? '0'),
  }
}

// The newest posts by date, as ids and modified times only.
async function fetchNewest(): Promise<{
  newest: { id: number; modifiedGmt: string }[]
  total: number
}> {
  const res = await fetchWordPress('/wp/v2/posts', {
    _fields: 'id,modified_gmt',
    orderby: 'date',
    order: 'desc',
    per_page: String(NEWEST_SCAN),
  })
  const raw = await readJson<{ id: number; modified_gmt?: string }[]>(
    res,
    'newest posts'
  )
  return {
    newest: (Array.isArray(raw) ? raw : []).map((p) => ({
      id: p.id,
      modifiedGmt: p.modified_gmt ?? '',
    })),
    total: Number(res.headers.get('X-WP-Total') ?? '0'),
  }
}

// One page of approved comments, as the ids of the posts they are on.
async function fetchCommentPosts(
  params: Record<string, string>
): Promise<{ postIds: number[]; totalPages: number }> {
  const res = await fetchWordPress('/wp/v2/comments', {
    _fields: 'post',
    per_page: String(COMMENTS_PER_PAGE),
    ...params,
  })
  if (res.status === 400 && Number(params.page ?? '1') > 1) {
    return { postIds: [], totalPages: 0 }
  }

  const raw = await readJson<{ post?: unknown }[]>(res, 'comments')
  return {
    postIds: (Array.isArray(raw) ? raw : []).flatMap((c) =>
      typeof c.post === 'number' && c.post > 0 ? [c.post] : []
    ),
    totalPages: Number(res.headers.get('X-WP-TotalPages') ?? '0'),
  }
}

// How many approved comments one post has.
async function fetchCommentTotal(postId: number): Promise<number> {
  const res = await fetchWordPress('/wp/v2/comments', {
    _fields: 'id',
    post: String(postId),
    per_page: '1',
  })
  await readJson<unknown>(res, 'comments')
  return Number(res.headers.get('X-WP-Total') ?? '0')
}

// --- Index ---

const UPSERT_STATE = `INSERT INTO sync_state (key, value) VALUES (?1, ?2)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value`

async function readState(db: D1, key: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT value FROM sync_state WHERE key = ?1')
    .bind(key)
    .first<{ value: string }>()
  return row?.value ?? null
}

function writeState(db: D1, key: string, value: string): D1Statement {
  return db.prepare(UPSERT_STATE).bind(key, value)
}

async function readGeneration(db: D1): Promise<number> {
  return Number((await readState(db, 'generation')) ?? '0') || 0
}

async function countPosts(db: D1): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS total FROM posts')
    .first<{ total: number }>()
  return row?.total ?? 0
}

function now(): string {
  return DateTime.utc().toISO() ?? ''
}

// A term or author that was removed in WordPress and made again has a new id
// under the same slug. The old row goes first, or the new one cannot be added.
const DELETE_REPLACED_TERMS = `DELETE FROM terms WHERE EXISTS (
  SELECT 1 FROM json_each(?1) AS incoming
  WHERE json_extract(incoming.value, '$.taxonomy') = terms.taxonomy
    AND json_extract(incoming.value, '$.slug') = terms.slug
    AND json_extract(incoming.value, '$.id') != terms.id)`

const DELETE_REPLACED_AUTHORS = `DELETE FROM authors WHERE EXISTS (
  SELECT 1 FROM json_each(?1) AS incoming
  WHERE json_extract(incoming.value, '$.slug') = authors.slug
    AND json_extract(incoming.value, '$.id') != authors.id)`

// Terms as they come attached to a post: no description, so the one stored
// is kept.
const UPSERT_TERMS = `INSERT INTO terms (id, taxonomy, slug, name, generation)
  SELECT json_extract(value, '$.id'), json_extract(value, '$.taxonomy'),
    json_extract(value, '$.slug'), json_extract(value, '$.name'), ?2
  FROM json_each(?1) WHERE true
  ON CONFLICT(id) DO UPDATE SET taxonomy = excluded.taxonomy,
    slug = excluded.slug, name = excluded.name,
    generation = MAX(terms.generation, excluded.generation)`

const UPSERT_TERMS_DESCRIBED = `INSERT INTO terms (id, taxonomy, slug, name, description,
    seo_title, seo_description, noindex, generation)
  SELECT json_extract(value, '$.id'), json_extract(value, '$.taxonomy'),
    json_extract(value, '$.slug'), json_extract(value, '$.name'),
    json_extract(value, '$.description'),
    COALESCE(json_extract(value, '$.seoTitle'), ''),
    COALESCE(json_extract(value, '$.seoDescription'), ''),
    COALESCE(json_extract(value, '$.noindex'), 0), ?2
  FROM json_each(?1) WHERE true
  ON CONFLICT(id) DO UPDATE SET taxonomy = excluded.taxonomy,
    slug = excluded.slug, name = excluded.name,
    description = excluded.description, seo_title = excluded.seo_title,
    seo_description = excluded.seo_description, noindex = excluded.noindex,
    generation = MAX(terms.generation, excluded.generation)`

// Authors as they come attached to a post: nothing from the SEO plugin, so
// what is stored of that is kept.
const UPSERT_AUTHORS = `INSERT INTO authors (id, slug, name, description, avatar, url, generation)
  SELECT json_extract(value, '$.id'), json_extract(value, '$.slug'),
    json_extract(value, '$.name'), json_extract(value, '$.description'),
    json_extract(value, '$.avatar'), json_extract(value, '$.url'), ?2
  FROM json_each(?1) WHERE true
  ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name,
    description = excluded.description, avatar = excluded.avatar,
    url = excluded.url,
    generation = MAX(authors.generation, excluded.generation)`

const UPSERT_AUTHORS_SEO = `INSERT INTO authors (id, slug, name, description, avatar, url,
    seo_title, seo_description, noindex, generation)
  SELECT json_extract(value, '$.id'), json_extract(value, '$.slug'),
    json_extract(value, '$.name'), json_extract(value, '$.description'),
    json_extract(value, '$.avatar'), json_extract(value, '$.url'),
    COALESCE(json_extract(value, '$.seoTitle'), ''),
    COALESCE(json_extract(value, '$.seoDescription'), ''),
    COALESCE(json_extract(value, '$.noindex'), 0), ?2
  FROM json_each(?1) WHERE true
  ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name,
    description = excluded.description, avatar = excluded.avatar,
    url = excluded.url, seo_title = excluded.seo_title,
    seo_description = excluded.seo_description, noindex = excluded.noindex,
    generation = MAX(authors.generation, excluded.generation)`

const UPSERT_POST = `INSERT INTO posts (id, slug, url, title, description, date,
    date_gmt, modified, modified_gmt, featured_image, featured_image_width,
    featured_image_height, author_id, generation, synced_at, comment_open,
    featured_image_sizes, seo_title, seo_description, noindex)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16,
    ?17, ?18, ?19, ?20)
  ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, url = excluded.url,
    title = excluded.title, description = excluded.description,
    date = excluded.date, date_gmt = excluded.date_gmt,
    modified = excluded.modified, modified_gmt = excluded.modified_gmt,
    featured_image = excluded.featured_image,
    featured_image_width = excluded.featured_image_width,
    featured_image_height = excluded.featured_image_height,
    featured_image_sizes = excluded.featured_image_sizes,
    author_id = excluded.author_id,
    generation = MAX(posts.generation, excluded.generation),
    synced_at = excluded.synced_at, comment_open = excluded.comment_open,
    seo_title = excluded.seo_title, seo_description = excluded.seo_description,
    noindex = excluded.noindex`

const INSERT_POST_TERMS = `INSERT INTO post_terms (post_id, term_id, taxonomy, position)
  SELECT ?1, json_extract(value, '$.id'), json_extract(value, '$.taxonomy'), key
  FROM json_each(?2)`

function deletePostStatements(db: D1, id: number): D1Statement[] {
  return [
    db.prepare('DELETE FROM posts_fts WHERE rowid = ?1').bind(id),
    db.prepare('DELETE FROM post_terms WHERE post_id = ?1').bind(id),
    db.prepare('DELETE FROM posts WHERE id = ?1').bind(id),
  ]
}

function postStatements(
  db: D1,
  post: IndexedPost,
  generation: number,
  syncedAt: string
): D1Statement[] {
  return [
    db
      .prepare(UPSERT_POST)
      .bind(
        post.id,
        post.slug,
        post.url,
        post.title,
        post.description,
        post.date,
        post.dateGmt,
        post.modified,
        post.modifiedGmt,
        post.featuredImage,
        post.featuredImageWidth,
        post.featuredImageHeight,
        post.authorId,
        generation,
        syncedAt,
        post.commentsOpen ? 1 : 0,
        post.featuredImageSizes,
        post.seoTitle,
        post.seoDescription,
        post.noindex
      ),
    db.prepare('DELETE FROM post_terms WHERE post_id = ?1').bind(post.id),
    db
      .prepare(INSERT_POST_TERMS)
      .bind(
        post.id,
        JSON.stringify(
          post.terms.map((t) => ({ id: t.id, taxonomy: t.taxonomy }))
        )
      ),
    db.prepare('DELETE FROM posts_fts WHERE rowid = ?1').bind(post.id),
    db
      .prepare(
        'INSERT INTO posts_fts (rowid, title, excerpt, body) VALUES (?1, ?2, ?3, ?4)'
      )
      .bind(post.id, htmlToText(post.title), post.description, post.body),
  ]
}

function termStatements(
  db: D1,
  terms: IndexedTerm[],
  generation: number,
  described: boolean
): D1Statement[] {
  if (!terms.length) return []
  const json = JSON.stringify(terms)
  return [
    db.prepare(DELETE_REPLACED_TERMS).bind(json),
    db
      .prepare(described ? UPSERT_TERMS_DESCRIBED : UPSERT_TERMS)
      .bind(json, generation),
  ]
}

function authorStatements(
  db: D1,
  authors: IndexedAuthor[],
  generation: number,
  withSeo = false
): D1Statement[] {
  if (!authors.length) return []
  const json = JSON.stringify(authors)
  return [
    db.prepare(DELETE_REPLACED_AUTHORS).bind(json),
    db
      .prepare(withSeo ? UPSERT_AUTHORS_SEO : UPSERT_AUTHORS)
      .bind(json, generation),
  ]
}

async function writePosts(
  db: D1,
  posts: IndexedPost[],
  generation: number
): Promise<void> {
  if (!posts.length) return

  const terms = new Map<number, IndexedTerm>()
  const authors = new Map<number, IndexedAuthor>()
  for (const post of posts) {
    for (const term of post.terms) terms.set(term.id, term)
    if (post.author) authors.set(post.author.id, post.author)
  }

  // A post that was removed and written again has a new id at the same
  // address. The old row goes first, or the new one cannot be added.
  const incoming = new Map(posts.map((p) => [p.url, p.id]))
  const { results: sameUrl } = await db
    .prepare(
      'SELECT id, url FROM posts WHERE url IN (SELECT value FROM json_each(?1))'
    )
    .bind(JSON.stringify([...incoming.keys()]))
    .all<{ id: number; url: string }>()

  const first: D1Statement[] = []
  for (const row of sameUrl) {
    if (incoming.get(row.url) !== row.id) {
      first.push(...deletePostStatements(db, row.id))
    }
  }
  first.push(...termStatements(db, [...terms.values()], generation, false))
  first.push(...authorStatements(db, [...authors.values()], generation))
  if (first.length) await db.batch(first)

  const syncedAt = now()
  for (let i = 0; i < posts.length; i += POSTS_PER_BATCH) {
    const statements = posts
      .slice(i, i + POSTS_PER_BATCH)
      .flatMap((post) => postStatements(db, post, generation, syncedAt))
    await db.batch(statements)
  }
}

// Of these posts, the ones the index does not have as WordPress has them now.
async function changedIds(
  db: D1,
  posts: { id: number; modifiedGmt: string }[]
): Promise<Set<number>> {
  if (!posts.length) return new Set()
  const { results } = await db
    .prepare(
      'SELECT id, modified_gmt FROM posts WHERE id IN (SELECT value FROM json_each(?1))'
    )
    .bind(JSON.stringify(posts.map((p) => p.id)))
    .all<{ id: number; modified_gmt: string }>()

  const stored = new Map(results.map((r) => [r.id, r.modified_gmt]))
  return new Set(
    posts.filter((p) => stored.get(p.id) !== p.modifiedGmt).map((p) => p.id)
  )
}

// Replaces the cached copy the post's own page is served from. If WordPress
// refuses, the copy is removed so the next view fetches it.
async function refreshCachedPost(url: string): Promise<void> {
  const parts = parsePostUrl(url)
  if (!parts) return
  const slug = decodeSlug(parts.slug)
  try {
    await refreshPost(slug, parts.year, parts.month)
  } catch (error) {
    console.error('Post cache refresh failed:', error)
    await deleteCachedPost(slug, parts.year, parts.month).catch(() => {})
  }
}

async function removeCachedPost(url: string): Promise<void> {
  const parts = parsePostUrl(url)
  if (!parts) return
  await deleteCachedPost(decodeSlug(parts.slug), parts.year, parts.month).catch(
    (error) => console.error('Post cache delete failed:', error)
  )
}

// Finds what is missing or out of date among the newest posts and writes it.
async function syncNewest(
  db: D1,
  generation: number,
  skip: Set<number>
): Promise<{ written: IndexedPost[]; wpTotal: number }> {
  const { newest, total } = await fetchNewest()
  const changed = await changedIds(db, newest)
  const ids = [...changed].filter((id) => !skip.has(id))
  if (!ids.length) return { written: [], wpTotal: total }

  const { posts } = await fetchPosts({
    include: ids.join(','),
    per_page: String(NEWEST_SCAN),
  })
  await writePosts(db, posts, generation)
  return { written: posts, wpTotal: total }
}

function latestModified(posts: IndexedPost[], current: string): string {
  let latest = current
  for (const post of posts) {
    if (post.modifiedGmt > latest) latest = post.modifiedGmt
  }
  return latest
}

// --- Pages ---

const UPSERT_PAGE = `INSERT INTO pages (id, slug, path, parent_id, menu_order,
    title, description, modified_gmt, seo_title, seo_description, noindex,
    run, synced_at)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
  ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, path = excluded.path,
    parent_id = excluded.parent_id, menu_order = excluded.menu_order,
    title = excluded.title, description = excluded.description,
    modified_gmt = excluded.modified_gmt, seo_title = excluded.seo_title,
    seo_description = excluded.seo_description, noindex = excluded.noindex,
    run = excluded.run, synced_at = excluded.synced_at`

// A page that was removed in WordPress and made again at the same path has
// a new id; the old row would otherwise keep the path.
const DELETE_REPLACED_PAGES = `DELETE FROM pages WHERE EXISTS (
  SELECT 1 FROM json_each(?1) AS incoming
  WHERE json_extract(incoming.value, '$.path') = pages.path
    AND json_extract(incoming.value, '$.id') != pages.id)`

export type PagesResult = {
  pages: number
  // The paths of pages that are new or changed, and of pages removed.
  changed: SyncedPost[]
  removed: string[]
}

// Reads every published page from WordPress and makes the index match:
// pages are few, so there is no picking out what changed. The cached body of
// a page that changed is fetched again, so an edit shows without waiting a
// day; a page WordPress no longer has loses its row and its cached body.
export async function syncPages(): Promise<PagesResult> {
  const db = getDb()
  const run = now()

  const incoming: IndexedPage[] = []
  let totalPages = 1
  for (let page = 1; page <= totalPages; page++) {
    const result = await fetchPages(page)
    incoming.push(...result.pages)
    if (result.totalPages) totalPages = result.totalPages
  }

  const { results: existing } = await db
    .prepare('SELECT id, path, modified_gmt AS modifiedGmt FROM pages')
    .all<{ id: number; path: string; modifiedGmt: string }>()
  const before = new Map(existing.map((row) => [row.id, row]))
  const changed = incoming.filter((page) => {
    const old = before.get(page.id)
    return (
      !old || old.path !== page.path || old.modifiedGmt !== page.modifiedGmt
    )
  })
  const seen = new Set(incoming.map((page) => page.id))
  const removed = existing.filter((row) => !seen.has(row.id)).map((r) => r.path)
  // A page that moved leaves a cached body at its old path.
  for (const page of changed) {
    const old = before.get(page.id)
    if (old && old.path !== page.path) removed.push(old.path)
  }

  const statements: D1Statement[] = [
    db
      .prepare(DELETE_REPLACED_PAGES)
      .bind(JSON.stringify(incoming.map((p) => ({ id: p.id, path: p.path })))),
    ...incoming.map((page) =>
      db
        .prepare(UPSERT_PAGE)
        .bind(
          page.id,
          page.slug,
          page.path,
          page.parentId,
          page.menuOrder,
          page.title,
          page.description,
          page.modifiedGmt,
          page.seoTitle,
          page.seoDescription,
          page.noindex,
          run,
          run
        )
    ),
    db.prepare('DELETE FROM pages WHERE run != ?1').bind(run),
  ]
  await db.batch(statements)

  for (const path of removed) {
    await deleteCachedPage(path).catch((error) =>
      console.error('Page cache delete failed:', error)
    )
  }
  for (const page of changed) {
    try {
      await refreshWordPressPage(page.path)
    } catch (error) {
      console.error('Page cache refresh failed:', error)
      await deleteCachedPage(page.path).catch(() => {})
    }
  }

  return {
    pages: incoming.length,
    changed: changed.map((p) => ({ title: p.title, url: p.path })),
    removed,
  }
}

// --- Comment counts ---

const ADD_COMMENTS =
  'UPDATE posts SET comment_count = COALESCE(comment_count, 0) + ?2 WHERE id = ?1'

function tally(postIds: number[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const id of postIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  return counts
}

// Counts these posts' comments again. A post whose count changed has its
// kept copy of the comments dropped, so its page shows them next time.
async function recountPosts(db: D1, postIds: Set<number>): Promise<void> {
  if (!postIds.size) return
  const { results } = await db
    .prepare(
      'SELECT id, comment_count FROM posts WHERE id IN (SELECT value FROM json_each(?1))'
    )
    .bind(JSON.stringify([...postIds]))
    .all<{ id: number; comment_count: number | null }>()

  for (const row of results) {
    const total = await fetchCommentTotal(row.id)
    if (total === row.comment_count) continue
    await db
      .prepare('UPDATE posts SET comment_count = ?2 WHERE id = ?1')
      .bind(row.id, total)
      .run()
    await clearComments(row.id).catch(() => {})
  }
}

// Part of Sync: the posts with comments written lately are counted again.
// Nothing is counted until a rebuild has counted everything once.
async function syncCommentCounts(db: D1): Promise<void> {
  const countedAt = await readState(db, 'comments_counted_at')
  if (!countedAt) return

  const after = `${DateTime.fromISO(countedAt, { zone: 'utc' })
    .minus({ days: COMMENT_OVERLAP_DAYS })
    .toFormat("yyyy-MM-dd'T'HH:mm:ss")}Z`
  const startedAt = now()

  const affected = new Set<number>()
  let pages = 1
  for (let page = 1; page <= pages; page++) {
    const { postIds, totalPages } = await fetchCommentPosts({
      after,
      orderby: 'id',
      order: 'asc',
      page: String(page),
    })
    pages = totalPages || pages
    for (const id of postIds) affected.add(id)
  }

  await recountPosts(db, affected)
  await writeState(db, 'comments_counted_at', startedAt).run()
}

// --- Sync ---

// Picks up the posts published or edited since the last run, one page of
// them a call. The caller calls again with the cursor until done is true.
export async function syncChanged(
  cursor?: SyncCursor | null
): Promise<SyncResult> {
  const db = getDb()
  const watermark = await readState(db, 'modified_watermark')

  if (!watermark) {
    return {
      done: true,
      cursor: null,
      needsRebuild: true,
      updated: [],
      wpTotal: null,
      indexTotal: await countPosts(db),
    }
  }

  // The watermark is in UTC, and says so, because WordPress reads a time
  // without a zone as the site's own.
  const modifiedAfter =
    cursor?.modifiedAfter ??
    `${DateTime.fromISO(watermark, { zone: 'utc' })
      .minus({ hours: OVERLAP_HOURS })
      .toFormat("yyyy-MM-dd'T'HH:mm:ss")}Z`
  const page = cursor?.page ?? 1
  const generation = await readGeneration(db)

  const { posts, totalPages } = await fetchPosts({
    modified_after: modifiedAfter,
    orderby: 'modified',
    order: 'asc',
    per_page: String(POSTS_PER_PAGE),
    page: String(page),
  })

  const changed = await changedIds(db, posts)
  const written = posts.filter((p) => changed.has(p.id))
  await writePosts(db, written, generation)

  // Oldest change first, so what has been read so far is everything up to
  // the latest of it, and a run that stops early can continue from there.
  const reached = latestModified(posts, watermark)
  if (reached !== watermark) {
    await writeState(db, 'modified_watermark', reached).run()
  }

  let wpTotal: number | null = null
  const done = page >= totalPages
  if (done) {
    const newest = await syncNewest(
      db,
      generation,
      new Set(posts.map((p) => p.id))
    )
    written.push(...newest.written)
    wpTotal = newest.wpTotal
    await syncCommentCounts(db)
    await writeState(db, 'last_synced_at', now()).run()
  }

  for (const post of written) await refreshCachedPost(post.url)

  // The pages too, once the posts are done.
  const pages = done ? await syncPages() : null
  const updated = written.map((p) => ({ title: p.title, url: p.url }))
  if (pages) {
    updated.push(...pages.changed)
    updated.push(...pages.removed.map((url) => ({ title: url, url })))
  }

  return {
    done,
    cursor: done ? null : { modifiedAfter, page: page + 1 },
    needsRebuild: false,
    updated,
    wpTotal,
    indexTotal: await countPosts(db),
  }
}

// Brings one post up to date, or removes it when WordPress answers that it
// has no such post. A refusal or failure from WordPress throws instead, so an
// outage never removes a post.
export async function syncPostByUrl(
  url: string
): Promise<'updated' | 'missing' | 'not-a-post'> {
  const parts = parsePostUrl(url)
  if (!parts) return 'not-a-post'

  const db = getDb()
  const { posts } = await fetchPosts({
    slug: decodeSlug(parts.slug),
    per_page: String(POSTS_PER_PAGE),
  })
  const target = normalizePostUrl(url)
  const post = posts.find((p) => p.url === target)

  if (!post) {
    await removePostByUrl(target)
    return 'missing'
  }

  await writePosts(db, [post], await readGeneration(db))
  return 'updated'
}

// Returns false when the index had no post at that address.
export async function removePostByUrl(url: string): Promise<boolean> {
  const db = getDb()
  const target = normalizePostUrl(url)
  const row = await db
    .prepare('SELECT id FROM posts WHERE url = ?1')
    .bind(target)
    .first<{ id: number }>()

  await removeCachedPost(target)
  if (!row) return false

  await db.batch(deletePostStatements(db, row.id))
  return true
}

// --- Rebuild ---

// Starts a rebuild. Every post written from here on carries the new run's
// number, which is how the end of the run tells what it did not see.
export async function startRebuild(): Promise<RebuildStart> {
  const db = getDb()
  const { total } = await fetchNewest()
  const runId = (await readGeneration(db)) + 1
  await writeState(db, 'generation', String(runId)).run()

  return {
    runId,
    total,
    totalPages: Math.max(1, Math.ceil(total / POSTS_PER_PAGE)),
    perPage: POSTS_PER_PAGE,
  }
}

export async function rebuildPage(
  runId: number,
  page: number
): Promise<{ page: number; count: number; totalPages: number }> {
  const db = getDb()
  // By id, oldest first: a post published during the run lands on the last
  // page instead of moving every post along by one.
  const { posts, totalPages } = await fetchPosts({
    orderby: 'id',
    order: 'asc',
    per_page: String(POSTS_PER_PAGE),
    page: String(page),
  })
  await writePosts(db, posts, runId)
  return { page, count: posts.length, totalPages }
}

// Reads one page of categories, tags or authors, including the ones no post
// uses and the descriptions that do not come attached to a post.
export async function rebuildTerms(
  runId: number,
  kind: RebuildKind,
  page: number
): Promise<{ page: number; count: number; totalPages: number }> {
  const db = getDb()
  const path =
    kind === 'category'
      ? '/wp/v2/categories'
      : kind === 'post_tag'
        ? '/wp/v2/tags'
        : '/wp/v2/users'

  const res = await fetchWordPress(path, {
    _fields:
      kind === 'author'
        ? 'id,name,slug,description,url,avatar_urls,yoast_head_json'
        : 'id,name,slug,description,yoast_head_json',
    per_page: String(TERMS_PER_PAGE),
    page: String(page),
  })
  if (res.status === 400 && page > 1) {
    return { page, count: 0, totalPages: 0 }
  }

  const raw = await readJson<
    {
      id?: unknown
      name?: unknown
      slug?: unknown
      description?: unknown
      url?: unknown
      avatar_urls?: WpAvatars
      yoast_head_json?: WpSeo
    }[]
  >(res, kind)
  const rows = (Array.isArray(raw) ? raw : []).flatMap((item) =>
    typeof item.id === 'number' && typeof item.slug === 'string' && item.slug
      ? [
          {
            id: item.id,
            slug: item.slug,
            name: decodeEntities(String(item.name ?? '')),
            description: decodeEntities(String(item.description ?? '')),
            avatar: readAvatar(item.avatar_urls),
            url: typeof item.url === 'string' ? item.url : '',
            ...readSeo(item.yoast_head_json),
          },
        ]
      : []
  )

  const statements =
    kind === 'author'
      ? authorStatements(db, rows, runId, true)
      : termStatements(
          db,
          rows.map((row) => ({ ...row, taxonomy: kind })),
          runId,
          true
        )
  if (statements.length) await db.batch(statements)

  return {
    page,
    count: rows.length,
    totalPages: Number(res.headers.get('X-WP-TotalPages') ?? '0'),
  }
}

// Reads one page of WordPress's approved comments and adds them to the count
// of the posts they are on. The first page starts every post from nothing.
export async function rebuildCounts(
  page: number
): Promise<{ page: number; count: number; totalPages: number }> {
  const db = getDb()
  if (page === 1) {
    await db.prepare('UPDATE posts SET comment_count = 0').run()
  }

  // By id, oldest first, for the same reason as posts.
  const { postIds, totalPages } = await fetchCommentPosts({
    orderby: 'id',
    order: 'asc',
    page: String(page),
  })

  const statements = [...tally(postIds)].map(([id, added]) =>
    db.prepare(ADD_COMMENTS).bind(id, added)
  )
  if (statements.length) await db.batch(statements)

  if (page >= totalPages) {
    await writeState(db, 'comments_counted_at', now()).run()
  }
  return { page, count: postIds.length, totalPages }
}

// Ends a rebuild by removing what the run did not see. Nothing is removed
// before this, so a run that is cancelled or fails leaves the index as it was.
export async function finishRebuild(
  runId: number,
  force = false
): Promise<FinishResult> {
  const db = getDb()

  // Posts published while the run was reading are picked up here.
  const { wpTotal } = await syncNewest(db, runId, new Set())

  const counts = await db
    .prepare(
      `SELECT COUNT(*) AS total,
        SUM(CASE WHEN generation >= ?1 THEN 1 ELSE 0 END) AS seen
      FROM posts`
    )
    .bind(runId)
    .first<{ total: number; seen: number | null }>()
  const total = counts?.total ?? 0
  const seen = counts?.seen ?? 0
  const stale = total - seen

  // Fewer posts read than WordPress has: the run missed some, and what it
  // missed would be removed as if it were gone.
  if (seen < wpTotal) {
    return { finished: false, reason: 'incomplete', seen, wpTotal, stale }
  }

  if (!force && stale > Math.max(STALE_LIMIT, total * STALE_SHARE)) {
    return { finished: false, reason: 'confirm', seen, wpTotal, stale }
  }

  const { results: staleRows } = await db
    .prepare('SELECT url FROM posts WHERE generation < ?1')
    .bind(runId)
    .all<{ url: string }>()

  const latest = await db
    .prepare(
      'SELECT MAX(modified_gmt) AS latest FROM posts WHERE generation >= ?1'
    )
    .bind(runId)
    .first<{ latest: string | null }>()

  const finishedAt = now()
  const statements: D1Statement[] = [
    db
      .prepare(
        'DELETE FROM posts_fts WHERE rowid IN (SELECT id FROM posts WHERE generation < ?1)'
      )
      .bind(runId),
    db
      .prepare(
        'DELETE FROM post_terms WHERE post_id IN (SELECT id FROM posts WHERE generation < ?1)'
      )
      .bind(runId),
    db.prepare('DELETE FROM posts WHERE generation < ?1').bind(runId),
    // Only once the run has read terms and authors of its own, so a run
    // that read none does not remove them all.
    db
      .prepare(
        `DELETE FROM terms WHERE generation < ?1
          AND EXISTS (SELECT 1 FROM terms WHERE generation >= ?1)`
      )
      .bind(runId),
    db
      .prepare(
        `DELETE FROM authors WHERE generation < ?1
          AND EXISTS (SELECT 1 FROM authors WHERE generation >= ?1)`
      )
      .bind(runId),
    db.prepare(
      'DELETE FROM post_terms WHERE term_id NOT IN (SELECT id FROM terms)'
    ),
    writeState(db, 'last_rebuild_at', finishedAt),
    writeState(db, 'last_synced_at', finishedAt),
  ]
  if (latest?.latest) {
    statements.push(writeState(db, 'modified_watermark', latest.latest))
  }
  await db.batch(statements)

  for (const row of staleRows) await removeCachedPost(row.url)

  return { finished: true, removed: staleRows.length, posts: seen }
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const db = getDb()
  const [posts, generation, lastSyncedAt, lastRebuildAt] = await Promise.all([
    countPosts(db),
    readGeneration(db),
    readState(db, 'last_synced_at'),
    readState(db, 'last_rebuild_at'),
  ])
  return { posts, generation, lastSyncedAt, lastRebuildAt }
}
