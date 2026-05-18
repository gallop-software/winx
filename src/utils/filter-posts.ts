import 'server-only'
import fs from 'fs'
import path from 'path'
import FlexSearch from 'flexsearch'
import blogData from '@/../_data/_blog.json'

export interface BlogPost {
  id: number
  slug: string
  url: string
  metadata: {
    title?: string
    description?: string
    date?: string
    categories?: string[]
    categorySlugs?: string[]
    tags?: string[]
    tagSlugs?: string[]
    featuredImage?: string
    featuredImageWidth?: number
    featuredImageHeight?: number
    author?: string
    authorSlug?: string
  }
  shareCount?: number
}

const posts = blogData as BlogPost[]

export interface FilterPostsParams {
  categorySlug?: string
  tagSlug?: string
  authorSlug?: string
  categoriesExclude?: string[]
  search?: string
  page?: number
  perPage?: number
}

interface SearchSection {
  url: string
  title?: string
  content?: string
  pageTitle?: string
}

function normalizeUrl(u: string): string {
  return (u.split('#')[0] || '').split('?')[0]?.replace(/\/+$/, '') || ''
}

let cachedIndex: { index: any; ready: boolean } | null = null

function getFlexIndex() {
  if (cachedIndex) return cachedIndex
  const file = path.join(process.cwd(), 'public/search-index.json')
  if (!fs.existsSync(file)) {
    cachedIndex = { index: null, ready: false }
    return cachedIndex
  }
  let sections: SearchSection[]
  try {
    sections = JSON.parse(fs.readFileSync(file, 'utf8')) as SearchSection[]
  } catch {
    cachedIndex = { index: null, ready: false }
    return cachedIndex
  }
  const index = new FlexSearch.Document({
    tokenize: 'full',
    document: {
      id: 'url',
      index: 'content',
      store: ['title', 'pageTitle', 'content'],
    },
    context: { resolution: 9, depth: 2, bidirectional: true },
  })
  for (const item of sections) {
    index.add({
      url: item.url,
      title: item.title || '',
      content: item.content || '',
      pageTitle: item.pageTitle || '',
    })
  }
  cachedIndex = { index, ready: true }
  return cachedIndex
}

function searchUrls(query: string): Set<string> | null {
  const { index, ready } = getFlexIndex()
  if (!ready || !index) {
    // Fallback: substring on title/description
    const needle = query.toLowerCase()
    const urls = new Set<string>()
    for (const p of posts) {
      const hay =
        `${p.metadata.title || ''} ${p.metadata.description || ''}`.toLowerCase()
      if (hay.includes(needle)) urls.add(normalizeUrl(p.url))
    }
    return urls
  }
  const results = index.search(query, { limit: 1000, enrich: false })
  const urls = new Set<string>()
  for (const group of results) {
    for (const id of group.result || []) {
      const u = normalizeUrl(String(id))
      if (u) urls.add(u)
    }
  }
  return urls
}

export interface FilterResult {
  posts: BlogPost[]
  total: number
  totalPages: number
  page: number
  perPage: number
}

export function filterPosts(params: FilterPostsParams = {}): FilterResult {
  const {
    categorySlug,
    tagSlug,
    authorSlug,
    categoriesExclude,
    search,
    page = 1,
    perPage = 9,
  } = params

  let out = posts

  if (categorySlug) {
    out = out.filter((p) =>
      (p.metadata.categorySlugs || []).includes(categorySlug)
    )
  }
  if (tagSlug) {
    out = out.filter((p) => (p.metadata.tagSlugs || []).includes(tagSlug))
  }
  if (authorSlug) {
    out = out.filter((p) => p.metadata.authorSlug === authorSlug)
  }
  if (categoriesExclude?.length) {
    const excludeSet = new Set(categoriesExclude.map((s) => s.toLowerCase()))
    out = out.filter(
      (p) =>
        !(p.metadata.categories || []).some((c) =>
          excludeSet.has(c.toLowerCase())
        )
    )
  }

  if (search && search.trim()) {
    const matchUrls = searchUrls(search.trim())
    if (matchUrls) {
      out = out.filter((p) => matchUrls.has(normalizeUrl(p.url)))
    }
  }

  const total = out.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const start = (page - 1) * perPage
  const slice = out.slice(start, start + perPage)

  return { posts: slice, total, totalPages, page, perPage }
}
