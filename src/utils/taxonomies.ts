import 'server-only'
import { cache } from 'react'
import { getDb } from '@/utils/d1'
import { normalizeSlug } from '@/utils/post-url'

// Categories, tags and authors from the content index in D1. Counts are of
// the posts in the index, so they change as soon as a post is synced.

export interface Term {
  id: number
  name: string
  slug: string
  description: string
  count?: number
  // From WordPress's SEO plugin: empty and 0 when it has nothing of its own.
  seoTitle?: string
  seoDescription?: string
  noindex?: number
}

export interface Author {
  id: number
  name: string
  slug: string
  description: string
  count?: number
  avatar?: string
  url?: string
  seoTitle?: string
  seoDescription?: string
  noindex?: number
}

// A category or tag with fewer posts than this has nothing a search engine
// would not find on the post itself, so its page is kept out of them and out
// of the sitemap. An author's page needs only one.
export const MIN_INDEXED_POSTS = 2

export function isThinArchive(
  archive: { count?: number; noindex?: number },
  minimum = MIN_INDEXED_POSTS
): boolean {
  return Boolean(archive.noindex) || (archive.count ?? 0) < minimum
}

type Taxonomy = 'category' | 'post_tag'

const TERM_SELECT = `SELECT t.id, t.name, t.slug, t.description,
  t.seo_title AS seoTitle, t.seo_description AS seoDescription, t.noindex,
  (SELECT COUNT(*) FROM post_terms pt WHERE pt.term_id = t.id) AS count
FROM terms t`

const AUTHOR_SELECT = `SELECT a.id, a.name, a.slug, a.description, a.avatar,
  a.url, a.seo_title AS seoTitle, a.seo_description AS seoDescription,
  a.noindex,
  (SELECT COUNT(*) FROM posts p WHERE p.author_id = a.id) AS count
FROM authors a`

const getTermBySlug = cache(
  async (taxonomy: Taxonomy, slug: string): Promise<Term | undefined> => {
    const row = await getDb()
      .prepare(`${TERM_SELECT} WHERE t.taxonomy = ?1 AND t.slug = ?2`)
      .bind(taxonomy, normalizeSlug(slug))
      .first<Term>()
    return row ?? undefined
  }
)

const getAllTerms = cache(async (taxonomy: Taxonomy): Promise<Term[]> => {
  const { results } = await getDb()
    .prepare(
      `${TERM_SELECT} WHERE t.taxonomy = ?1 ORDER BY t.name COLLATE NOCASE, t.id`
    )
    .bind(taxonomy)
    .all<Term>()
  return results
})

export function getCategoryBySlug(slug: string): Promise<Term | undefined> {
  return getTermBySlug('category', slug)
}

export function getTagBySlug(slug: string): Promise<Term | undefined> {
  return getTermBySlug('post_tag', slug)
}

export const getAuthorBySlug = cache(
  async (slug: string): Promise<Author | undefined> => {
    const row = await getDb()
      .prepare(`${AUTHOR_SELECT} WHERE a.slug = ?1`)
      .bind(normalizeSlug(slug))
      .first<Author>()
    return row ?? undefined
  }
)

export function getAllCategories(): Promise<Term[]> {
  return getAllTerms('category')
}

export function getAllTags(): Promise<Term[]> {
  return getAllTerms('post_tag')
}

export const getAllAuthors = cache(async (): Promise<Author[]> => {
  const { results } = await getDb()
    .prepare(`${AUTHOR_SELECT} ORDER BY a.name COLLATE NOCASE, a.id`)
    .all<Author>()
  return results
})
