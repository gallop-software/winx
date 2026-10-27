import 'server-only'
import { cache } from 'react'
import { getDb } from '@/utils/d1'
import { normalizePostUrl, normalizeSlug } from '@/utils/post-url'
import { MIN_INDEXED_POSTS } from '@/utils/taxonomies'

// Reads the content index in D1, which src/utils/content-sync.ts fills from
// WordPress. Everything that lists or looks up posts reads it here, at request
// time, so a post shows up as soon as it has been synced.

export interface BlogPost {
  id: number
  slug: string
  url: string
  metadata: {
    title?: string
    description?: string
    date?: string
    // Published and last changed, in GMT ("2026-08-08T18:54:03").
    dateGmt?: string
    modifiedGmt?: string
    // From WordPress's SEO plugin, when it has something of its own to say.
    seoTitle?: string
    seoDescription?: string
    noindex?: boolean
    categories?: string[]
    categorySlugs?: string[]
    tags?: string[]
    tagSlugs?: string[]
    featuredImage?: string
    featuredImageWidth?: number
    featuredImageHeight?: number
    // Smaller copies of the featured image, as a srcset. Missing until the
    // post has been synced with them.
    featuredImageSrcSet?: string
    author?: string
    authorSlug?: string
    // Approved comments. Missing until the post has been counted.
    commentCount?: number
    commentsOpen?: boolean
  }
}

// A month with posts, as the archive lists them: year and month as they appear
// in a post's address ('2026', '10').
export type MonthCount = { year: string; month: string; count: number }

export type SearchHit = {
  url: string
  title: string
  // The part of the post that matched. Matched words sit between
  // SNIPPET_MARK_START and SNIPPET_MARK_END.
  snippet: string
}

export const SNIPPET_MARK_START = '\u0002'
export const SNIPPET_MARK_END = '\u0003'

export type PostRow = {
  id: number
  slug: string
  url: string
  title: string
  description: string
  date: string
  date_gmt: string
  modified_gmt: string
  seo_title: string
  seo_description: string
  noindex: number
  featured_image: string
  featured_image_width: number | null
  featured_image_height: number | null
  featured_image_sizes: string | null
  author_name: string
  author_slug: string
  categories: string
  tags: string
  comment_count: number | null
  comment_open: number
}

function termList(taxonomy: 'category' | 'post_tag') {
  return `(SELECT json_group_array(json_object('name', name, 'slug', slug)) FROM
    (SELECT t.name, t.slug FROM post_terms pt JOIN terms t ON t.id = pt.term_id
     WHERE pt.post_id = p.id AND pt.taxonomy = '${taxonomy}'
     ORDER BY pt.position))`
}

// One row per post, with its categories and tags gathered as JSON. Followed
// by the caller's WHERE, ORDER BY and LIMIT.
export const POST_SELECT = `SELECT p.id, p.slug, p.url, p.title, p.description,
  p.date, p.date_gmt, p.modified_gmt, p.seo_title, p.seo_description, p.noindex,
  p.featured_image, p.featured_image_width, p.featured_image_height,
  p.featured_image_sizes, p.comment_count, p.comment_open,
  COALESCE(a.name, '') AS author_name, COALESCE(a.slug, '') AS author_slug,
  ${termList('category')} AS categories,
  ${termList('post_tag')} AS tags
FROM posts p LEFT JOIN authors a ON a.id = p.author_id`

export const NEWEST_FIRST = 'ORDER BY p.date DESC, p.id DESC'

type ImageSize = { url: string; w: number }

function readImageSizes(json: string | null): ImageSize[] {
  if (!json) return []
  try {
    const sizes = JSON.parse(json)
    return Array.isArray(sizes)
      ? sizes.filter(
          (s): s is ImageSize =>
            typeof s?.url === 'string' && typeof s?.w === 'number'
        )
      : []
  } catch {
    return []
  }
}

function toSrcSet(json: string | null): string | undefined {
  const sizes = readImageSizes(json)
  return sizes.length > 1
    ? sizes.map((s) => `${encodeURI(s.url)} ${s.w}w`).join(', ')
    : undefined
}

function readTerms(json: string): { name: string; slug: string }[] {
  try {
    const terms = JSON.parse(json)
    return Array.isArray(terms) ? terms : []
  } catch {
    return []
  }
}

export function toBlogPost(row: PostRow): BlogPost {
  const srcSet = toSrcSet(row.featured_image_sizes)
  const categories = readTerms(row.categories)
  const tags = readTerms(row.tags)
  return {
    id: row.id,
    slug: row.slug,
    url: row.url,
    metadata: {
      title: row.title,
      description: row.description,
      date: row.date,
      ...(row.date_gmt ? { dateGmt: row.date_gmt } : {}),
      ...(row.modified_gmt ? { modifiedGmt: row.modified_gmt } : {}),
      ...(row.seo_title ? { seoTitle: row.seo_title } : {}),
      ...(row.seo_description ? { seoDescription: row.seo_description } : {}),
      ...(row.noindex ? { noindex: true } : {}),
      categories: categories.map((c) => c.name),
      categorySlugs: categories.map((c) => c.slug),
      tags: tags.map((t) => t.name),
      tagSlugs: tags.map((t) => t.slug),
      featuredImage: row.featured_image,
      ...(row.featured_image_width
        ? { featuredImageWidth: row.featured_image_width }
        : {}),
      ...(row.featured_image_height
        ? { featuredImageHeight: row.featured_image_height }
        : {}),
      ...(srcSet ? { featuredImageSrcSet: srcSet } : {}),
      author: row.author_name,
      authorSlug: row.author_slug,
      ...(typeof row.comment_count === 'number'
        ? { commentCount: row.comment_count }
        : {}),
      commentsOpen: row.comment_open === 1,
    },
  }
}

// Notes what a fresh read of a post's comments found. The one thing written
// to the index outside content-sync.ts: it is a count, not content.
export async function recordCommentCount(
  postId: number,
  count: number,
  open: boolean
): Promise<void> {
  await getDb()
    .prepare(
      'UPDATE posts SET comment_count = ?2, comment_open = ?3 WHERE id = ?1'
    )
    .bind(postId, count, open ? 1 : 0)
    .run()
}

// cache() shares one lookup between the parts of a page that ask for it.
export const getLatestPost = cache(async (): Promise<BlogPost | null> => {
  const row = await getDb()
    .prepare(`${POST_SELECT} ${NEWEST_FIRST} LIMIT 1`)
    .first<PostRow>()
  return row ? toBlogPost(row) : null
})

export const getPostByUrl = cache(
  async (url: string): Promise<BlogPost | null> => {
    const row = await getDb()
      .prepare(`${POST_SELECT} WHERE p.url = ?1`)
      .bind(normalizePostUrl(url))
      .first<PostRow>()
    return row ? toBlogPost(row) : null
  }
)

export const getPostBySlug = cache(
  async (slug: string): Promise<BlogPost | null> => {
    const row = await getDb()
      .prepare(`${POST_SELECT} WHERE p.slug = ?1 ${NEWEST_FIRST} LIMIT 1`)
      .bind(normalizeSlug(slug))
      .first<PostRow>()
    return row ? toBlogPost(row) : null
  }
)

// Whether the index has a post with this id. A cheap way to tell a real post
// from a number someone made up, before WordPress is asked about it.
export async function postExists(id: number): Promise<boolean> {
  const row = await getDb()
    .prepare('SELECT 1 AS found FROM posts WHERE id = ?1')
    .bind(id)
    .first<{ found: number }>()
  return row !== null
}

// The site path of the post with this id, or null if the index has none.
export async function getPostUrlById(id: number): Promise<string | null> {
  const row = await getDb()
    .prepare('SELECT url FROM posts WHERE id = ?1')
    .bind(id)
    .first<{ url: string }>()
  return row?.url ?? null
}

// Post ids by slug, keyed by the slugs as they were given. A slug the index
// does not have is left out.
export async function getPostIdsBySlugs(
  slugs: string[]
): Promise<Record<string, number>> {
  if (!slugs.length) return {}
  const given = new Map(slugs.map((slug) => [normalizeSlug(slug), slug]))
  const { results } = await getDb()
    .prepare(
      `SELECT id, slug FROM posts
        WHERE slug IN (SELECT value FROM json_each(?1))
        ORDER BY date, id`
    )
    .bind(JSON.stringify([...given.keys()]))
    .all<{ id: number; slug: string }>()

  const ids: Record<string, number> = {}
  for (const row of results) {
    const slug = given.get(row.slug)
    if (slug !== undefined) ids[slug] = row.id
  }
  return ids
}

// How many posts each month has, newest month first. Dates are WordPress
// local time, so a post counts for the month WordPress shows it in.
export async function getMonthCounts(): Promise<MonthCount[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT substr(date, 1, 4) AS year, substr(date, 6, 2) AS month,
        COUNT(*) AS count
      FROM posts
      GROUP BY year, month
      ORDER BY year DESC, month DESC`
    )
    .all<MonthCount>()
  return results
}

const MAX_SEARCH_WORDS = 12

// Turns what was typed into a full-text query: every word must be present,
// and the last one may be the start of a word, since it may still be being
// typed. Words are quoted, so nothing typed is read as query syntax. Null when
// there is nothing to search for.
export function buildFtsQuery(input: string): string | null {
  const words = input
    .normalize('NFKC')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, MAX_SEARCH_WORDS)
  if (!words.length) return null
  return words
    .map((word, i) => `"${word}"${i === words.length - 1 ? '*' : ''}`)
    .join(' ')
}

export async function searchPosts(
  query: string,
  limit = 20
): Promise<SearchHit[]> {
  const match = buildFtsQuery(query)
  if (!match) return []
  const { results } = await getDb()
    .prepare(
      `SELECT p.url, p.title,
        snippet(posts_fts, -1, char(2), char(3), '…', 24) AS snippet
      FROM posts_fts JOIN posts p ON p.id = posts_fts.rowid
      WHERE posts_fts MATCH ?1
      ORDER BY posts_fts.rank LIMIT ?2`
    )
    .bind(match, limit)
    .all<SearchHit>()
  return results
}

export async function getSitemapPosts(): Promise<
  { url: string; modified: string }[]
> {
  const { results } = await getDb()
    .prepare(
      `SELECT url, modified_gmt AS modified FROM posts
        WHERE noindex = 0
        ORDER BY date DESC, id DESC`
    )
    .all<{ url: string; modified: string }>()
  return results
}

// The terms search engines are shown: the ones with enough posts to be worth
// a page of their own (see isThinArchive in src/utils/taxonomies.ts), with
// when their newest post last changed.
export async function getSitemapTerms(
  taxonomy: 'category' | 'post_tag'
): Promise<{ slug: string; modified: string | null }[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT t.slug, MAX(p.modified_gmt) AS modified
        FROM terms t
          JOIN post_terms pt ON pt.term_id = t.id
          JOIN posts p ON p.id = pt.post_id
        WHERE t.taxonomy = ?1 AND t.noindex = 0
        GROUP BY t.id HAVING COUNT(*) >= ?2
        ORDER BY t.slug`
    )
    .bind(taxonomy, MIN_INDEXED_POSTS)
    .all<{ slug: string; modified: string | null }>()
  return results
}

// The authors with posts, with when their newest post last changed.
export async function getSitemapAuthors(): Promise<
  { slug: string; modified: string | null }[]
> {
  const { results } = await getDb()
    .prepare(
      `SELECT a.slug, MAX(p.modified_gmt) AS modified
        FROM authors a JOIN posts p ON p.author_id = a.id
        WHERE a.noindex = 0
        GROUP BY a.id
        ORDER BY a.slug`
    )
    .all<{ slug: string; modified: string | null }>()
  return results
}

// When the index last changed, for the sitemap index. Null before the first
// sync.
export async function getLastSyncedAt(): Promise<string | null> {
  const row = await getDb()
    .prepare(`SELECT value FROM sync_state WHERE key = 'last_synced_at'`)
    .first<{ value: string }>()
  return row?.value ?? null
}
