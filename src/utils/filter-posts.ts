import 'server-only'
import { getDb } from '@/utils/d1'
import {
  buildFtsQuery,
  NEWEST_FIRST,
  POST_SELECT,
  toBlogPost,
  type BlogPost,
  type PostRow,
} from '@/utils/content-index'
import { normalizeSlug } from '@/utils/post-url'
import { DateTime } from 'luxon'

export type { BlogPost }

export interface FilterPostsParams {
  categorySlug?: string
  tagSlug?: string
  authorSlug?: string
  categoriesExclude?: string[]
  search?: string
  // A year ('2026'), and within it a month ('10'), as they appear in a post's
  // address. The month is ignored without the year.
  year?: string
  month?: string
  page?: number
  perPage?: number
}

export interface FilterResult {
  posts: BlogPost[]
  total: number
  totalPages: number
  page: number
  perPage: number
}

const HAS_TERM = `EXISTS (SELECT 1 FROM post_terms pt
  WHERE pt.post_id = p.id AND pt.term_id =
    (SELECT id FROM terms WHERE taxonomy = ? AND slug = ?))`

// Categories are excluded by name, in any case.
const NOT_IN_CATEGORIES = `NOT EXISTS (SELECT 1 FROM post_terms pt
  JOIN terms t ON t.id = pt.term_id
  WHERE pt.post_id = p.id AND t.taxonomy = 'category'
    AND lower(t.name) IN (SELECT lower(value) FROM json_each(?)))`

// The first day of the year or month and of the one after it, as the start of
// a post's date text, so the posts between can be found by string comparison.
// Null when the year or month is not one.
export function dateRange(
  year: string,
  month?: string
): { from: string; to: string } | null {
  if (!/^\d{4}$/.test(year)) return null
  if (month !== undefined && !/^(0[1-9]|1[0-2])$/.test(month)) return null
  const from = DateTime.fromObject({
    year: Number(year),
    month: month ? Number(month) : 1,
  })
  const to = from.plus(month ? { months: 1 } : { years: 1 })
  return { from: from.toFormat('yyyy-MM-dd'), to: to.toFormat('yyyy-MM-dd') }
}

// One page of posts from the content index, newest first, or best match first
// when searching.
export async function filterPosts(
  params: FilterPostsParams = {}
): Promise<FilterResult> {
  const {
    categorySlug,
    tagSlug,
    authorSlug,
    categoriesExclude,
    search,
    year,
    month,
    page = 1,
    perPage = 9,
  } = params

  const empty = { posts: [], total: 0, totalPages: 1, page, perPage }

  const conditions: string[] = []
  const values: unknown[] = []
  let join = ''
  let order = NEWEST_FIRST

  if (search && search.trim()) {
    const match = buildFtsQuery(search)
    if (!match) return empty
    join = 'JOIN posts_fts ON posts_fts.rowid = p.id'
    conditions.push('posts_fts MATCH ?')
    values.push(match)
    order = 'ORDER BY posts_fts.rank, p.date DESC, p.id DESC'
  }
  if (categorySlug) {
    conditions.push(HAS_TERM)
    values.push('category', normalizeSlug(categorySlug))
  }
  if (tagSlug) {
    conditions.push(HAS_TERM)
    values.push('post_tag', normalizeSlug(tagSlug))
  }
  if (authorSlug) {
    conditions.push('a.slug = ?')
    values.push(normalizeSlug(authorSlug))
  }
  if (categoriesExclude?.length) {
    conditions.push(NOT_IN_CATEGORIES)
    values.push(JSON.stringify(categoriesExclude))
  }
  if (year) {
    const range = dateRange(year, month)
    if (!range) return empty
    conditions.push('p.date >= ? AND p.date < ?')
    values.push(range.from, range.to)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const db = getDb()

  const [list, count] = await db.batch<PostRow | { total: number }>([
    db
      .prepare(`${POST_SELECT} ${join} ${where} ${order} LIMIT ? OFFSET ?`)
      .bind(...values, perPage, (page - 1) * perPage),
    db
      .prepare(
        `SELECT COUNT(*) AS total
          FROM posts p LEFT JOIN authors a ON a.id = p.author_id
          ${join} ${where}`
      )
      .bind(...values),
  ])

  const total = (count?.results[0] as { total: number } | undefined)?.total ?? 0

  return {
    posts: ((list?.results ?? []) as PostRow[]).map(toBlogPost),
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    page,
    perPage,
  }
}
