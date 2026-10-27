import 'server-only'
import { cache } from 'react'
import { getDb } from '@/utils/d1'
import { normalizePostUrl } from '@/utils/post-url'

// WordPress pages, as the content index holds them. The rows are written by
// syncPages() in src/utils/content-sync.ts; a page's body comes from
// getWordPressPage() in src/utils/post-cache.ts.

export interface SitePage {
  id: number
  slug: string
  path: string
  parentId: number
  menuOrder: number
  title: string
  description: string
  modifiedGmt: string
  seoTitle: string
  seoDescription: string
  noindex: number
}

export type PageNode = SitePage & { children: PageNode[] }

const PAGE_SELECT = `SELECT id, slug, path, parent_id AS parentId,
  menu_order AS menuOrder, title, description, modified_gmt AS modifiedGmt,
  seo_title AS seoTitle, seo_description AS seoDescription, noindex
FROM pages`

// As WordPress arranges them: by menu order, then by name.
const PAGE_ORDER = 'ORDER BY menu_order, title COLLATE NOCASE, id'

export function pagePath(path: string): string {
  return normalizePostUrl(path) || '/'
}

export const getPageByPath = cache(
  async (path: string): Promise<SitePage | null> => {
    const row = await getDb()
      .prepare(`${PAGE_SELECT} WHERE path = ?1`)
      .bind(pagePath(path))
      .first<SitePage>()
    return row ?? null
  }
)

export const getAllPages = cache(async (): Promise<SitePage[]> => {
  const { results } = await getDb()
    .prepare(`${PAGE_SELECT} ${PAGE_ORDER}`)
    .all<SitePage>()
  return results
})

// The pages as a tree, each parent's children in its order. A page whose
// parent is missing sits at the top.
export async function getPageTree(): Promise<PageNode[]> {
  const pages = await getAllPages()
  const nodes = new Map<number, PageNode>(
    pages.map((page) => [page.id, { ...page, children: [] }])
  )
  const roots: PageNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

// The page's parents, the top one first.
export async function getPageAncestors(page: SitePage): Promise<SitePage[]> {
  const pages = await getAllPages()
  const byId = new Map(pages.map((p) => [p.id, p]))
  const ancestors: SitePage[] = []
  let parentId = page.parentId
  while (parentId) {
    const parent = byId.get(parentId)
    if (!parent || ancestors.includes(parent)) break
    ancestors.unshift(parent)
    parentId = parent.parentId
  }
  return ancestors
}

export async function getSitemapPages(): Promise<
  { path: string; modified: string }[]
> {
  const { results } = await getDb()
    .prepare(
      `SELECT path, modified_gmt AS modified FROM pages
      WHERE noindex = 0 ORDER BY path`
    )
    .all<{ path: string; modified: string }>()
  return results
}

// The path of the page with this WordPress id, or null when the index does
// not have it. Answers WordPress's ?page_id=N addresses.
export async function getPagePathById(id: number): Promise<string | null> {
  const row = await getDb()
    .prepare('SELECT path FROM pages WHERE id = ?1')
    .bind(id)
    .first<{ path: string }>()
  return row?.path ?? null
}

export async function pageExists(path: string): Promise<boolean> {
  const row = await getDb()
    .prepare('SELECT 1 AS found FROM pages WHERE path = ?1')
    .bind(pagePath(path))
    .first()
  return row !== null
}
