import { DateTime } from 'luxon'
import { siteName, siteTagline } from '@/app/metadata'
import type { PageMetadata } from '@/utils/page-helpers'
import {
  authorSchemaId,
  buildAuthorSchema,
  buildPageSchema,
} from '@/utils/structured-data'
import { isThinArchive } from '@/utils/taxonomies'

// What a category's, tag's, author's, year's or month's page of posts tells
// search engines. The pages differ only in their words, so they share this.

export type ArchiveKind = 'category' | 'tag' | 'author' | 'year' | 'month'

export interface Archive {
  kind: ArchiveKind
  name: string
  // A year's or month's slug is its path: '2026' or '2026/10'.
  slug: string
  description?: string
  count?: number
  // From WordPress's SEO plugin, when it has something of its own.
  seoTitle?: string
  seoDescription?: string
  noindex?: number
  // Authors only.
  avatar?: string
  url?: string
}

const LABELS: Record<ArchiveKind, string> = {
  category: 'Category',
  tag: 'Tag',
  author: 'Author',
  year: 'Year',
  month: 'Month',
}

function isDated(archive: Archive): boolean {
  return archive.kind === 'year' || archive.kind === 'month'
}

// The archive of a year ('2026') or of a month in it ('10'), named as its
// page's heading reads: "2026" or "October 2026".
export function dateArchive(
  year: string,
  month: string | undefined,
  count: number
): Archive {
  if (month === undefined) {
    return { kind: 'year', name: year, slug: year, count }
  }
  const name = DateTime.fromObject({
    year: Number(year),
    month: Number(month),
  }).toFormat('LLLL yyyy')
  return { kind: 'month', name, slug: `${year}/${month}`, count }
}

export function archiveLabel(kind: ArchiveKind): string {
  return LABELS[kind]
}

// The page number an address asks for with ?page=, or null when it is not one.
export function readPageParam(value: string | string[] | undefined): number | null {
  if (value === undefined) return 1
  const text = Array.isArray(value) ? value[0] : value
  if (!text || !/^[1-9]\d{0,5}$/.test(text)) return null
  return Number(text)
}

// The archive's own address. Its first page has no number.
export function archivePath(archive: Archive, page = 1): string {
  const path = isDated(archive)
    ? `/${archive.slug}/`
    : `/${archive.kind}/${archive.slug}/`
  return page > 1 ? `${path}?page=${page}` : path
}

function articles(count: number) {
  return count === 1 ? '1 article' : `${count.toLocaleString('en-US')} articles`
}

// A tag often has the name of a category, and the two would otherwise share
// a title.
function titleOf(archive: Archive): string {
  if (archive.seoTitle && archive.seoTitle !== archive.name) {
    return archive.seoTitle
  }
  return archive.kind === 'tag'
    ? `Articles tagged “${archive.name}”`
    : archive.name
}

function descriptionOf(archive: Archive): string {
  if (archive.seoDescription) return archive.seoDescription
  if (archive.description) return archive.description
  const count = articles(archive.count ?? 0)
  const from = `${siteName}: ${siteTagline.toLowerCase()}.`
  if (archive.kind === 'author') {
    return `${count} by ${archive.name} on ${from}`
  }
  if (isDated(archive)) {
    return `${count} from ${archive.name} on ${from}`
  }
  return archive.kind === 'tag'
    ? `${count} tagged “${archive.name}” on ${from}`
    : `${count} on ${archive.name} from ${from}`
}

// An archive with too few posts adds nothing a search engine would not find
// on the posts themselves. An author's page needs only one.
function isThin(archive: Archive): boolean {
  return isThinArchive(archive, archive.kind === 'author' ? 1 : undefined)
}

function pageTitle(archive: Archive, page: number): string {
  const title = titleOf(archive)
  return page > 1 ? `${title} – Page ${page}` : title
}

export function archiveMetadata(archive: Archive, page: number): PageMetadata {
  const description = descriptionOf(archive)
  return {
    title: pageTitle(archive, page),
    description,
    // Each page of the archive is its own page, not a copy of the first.
    alternates: { canonical: archivePath(archive, page) },
    ...(isThin(archive) ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: archive.kind === 'author' ? 'profile' : 'website' },
  }
}

export function archiveSchema(
  archive: Archive,
  page: number,
  posts: { url: string; metadata: { title?: string } }[]
): object[] {
  const isAuthor = archive.kind === 'author'
  const person = isAuthor ? buildAuthorSchema(archive) : null
  return buildPageSchema({
    url: archivePath(archive, page),
    title: pageTitle(archive, page),
    description: descriptionOf(archive),
    type: isAuthor ? 'ProfilePage' : 'CollectionPage',
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: archive.name, href: archivePath(archive) },
    ],
    ...(isAuthor ? { mainEntity: authorSchemaId(archive) } : {}),
    posts: posts.map((post) => ({
      url: `${post.url}/`,
      title: post.metadata.title ?? '',
    })),
    ...(person ? { schemaList: [person] } : {}),
  })
}
