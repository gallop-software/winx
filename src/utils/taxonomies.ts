import taxonomies from '@/../_data/_taxonomies.json'

export interface Term {
  id: number
  name: string
  slug: string
  description: string
  count?: number
}

export interface Author {
  id: number
  name: string
  slug: string
  description: string
}

interface Taxonomies {
  categories: Term[]
  tags: Term[]
  authors: Author[]
}

const data = taxonomies as Taxonomies

export function getCategoryBySlug(slug: string): Term | undefined {
  return data.categories.find((c) => c.slug === slug)
}

export function getTagBySlug(slug: string): Term | undefined {
  return data.tags.find((t) => t.slug === slug)
}

export function getAuthorBySlug(slug: string): Author | undefined {
  return data.authors.find((a) => a.slug === slug)
}

export function getAllCategories(): Term[] {
  return data.categories
}

export function getAllTags(): Term[] {
  return data.tags
}

export function getAllAuthors(): Author[] {
  return data.authors
}
