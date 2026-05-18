#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

const OUTPUT_FILE = path.join(ROOT_DIR, '_data/_blog.json')
const TAX_FILE = path.join(ROOT_DIR, '_data/_taxonomies.json')
const PER_PAGE = 20

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  const text = fs.readFileSync(file, 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    let [, k, v] = m
    v = v.replace(/^['"]|['"]$/g, '')
    if (process.env[k] === undefined) process.env[k] = v
  }
}

loadEnvFile(path.join(ROOT_DIR, '.env.local'))
loadEnvFile(path.join(ROOT_DIR, '.env'))

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
}

function decodeEntities(input) {
  if (!input) return input
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
}

function flatTerms(raw) {
  const groups = raw._embedded?.['wp:term'] || []
  const all = []
  for (const group of groups) {
    if (Array.isArray(group)) all.push(...group)
  }
  return all
}

function mapPost(raw) {
  const link = raw.link ? new URL(raw.link).pathname : null
  if (!link) return null
  const featured = raw._embedded?.['wp:featuredmedia']?.[0]
  const terms = flatTerms(raw)
  const categories = terms.filter((t) => t.taxonomy === 'category')
  const tags = terms.filter((t) => t.taxonomy === 'post_tag')
  const author = raw._embedded?.author?.[0]
  return {
    id: raw.id,
    slug: raw.slug,
    url: link.endsWith('/') ? link.slice(0, -1) : link,
    metadata: {
      title: decodeEntities(raw.title?.rendered || ''),
      description: raw.excerpt?.rendered
        ? decodeEntities(raw.excerpt.rendered.replace(/<[^>]*>/g, '').trim())
        : '',
      date: raw.date || '',
      categories: categories.map((c) => decodeEntities(c.name)),
      categorySlugs: categories.map((c) => c.slug),
      tags: tags.map((t) => decodeEntities(t.name)),
      tagSlugs: tags.map((t) => t.slug),
      featuredImage: featured?.source_url || '',
      featuredImageWidth: featured?.media_details?.width || undefined,
      featuredImageHeight: featured?.media_details?.height || undefined,
      author: decodeEntities(author?.name || ''),
      authorSlug: author?.slug || '',
    },
  }
}

async function fetchAllPosts(wpJson) {
  const posts = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages) {
    const params = new URLSearchParams({
      _embed: 'wp:featuredmedia,wp:term,author',
      _fields: 'id,slug,link,title,excerpt,date,_links,_embedded',
      per_page: String(PER_PAGE),
      page: String(page),
    })
    params.set('_', String(Date.now()))
    const url = `${wpJson}/wp/v2/posts?${params.toString()}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    if (!res.ok) {
      throw new Error(`WP fetch failed page ${page}: HTTP ${res.status}`)
    }
    totalPages = Number(res.headers.get('X-WP-TotalPages') || '1')
    const data = await res.json()
    for (const raw of data) {
      const mapped = mapPost(raw)
      if (mapped) posts.push(mapped)
    }
    console.log(`📄 Fetched page ${page}/${totalPages} (${data.length} posts)`)
    page++
  }
  posts.sort((a, b) => {
    const da = new Date(a.metadata.date).getTime()
    const db = new Date(b.metadata.date).getTime()
    return db - da
  })
  return posts
}

async function fetchAllPaginated(url) {
  const out = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages) {
    const u = new URL(url)
    u.searchParams.set('per_page', '100')
    u.searchParams.set('page', String(page))
    u.searchParams.set('_', String(Date.now()))
    const res = await fetch(u.toString(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    if (!res.ok) {
      throw new Error(`Fetch failed ${u.pathname} page ${page}: HTTP ${res.status}`)
    }
    totalPages = Number(res.headers.get('X-WP-TotalPages') || '1')
    const data = await res.json()
    out.push(...data)
    page++
  }
  return out
}

async function fetchTaxonomies(wpJson) {
  const [cats, tags, users] = await Promise.all([
    fetchAllPaginated(
      `${wpJson}/wp/v2/categories?_fields=id,name,slug,description,count`
    ),
    fetchAllPaginated(
      `${wpJson}/wp/v2/tags?_fields=id,name,slug,description,count`
    ),
    fetchAllPaginated(`${wpJson}/wp/v2/users?_fields=id,name,slug,description`),
  ])
  return {
    categories: cats.map((c) => ({
      id: c.id,
      name: decodeEntities(c.name),
      slug: c.slug,
      description: decodeEntities(c.description || ''),
      count: c.count || 0,
    })),
    tags: tags.map((t) => ({
      id: t.id,
      name: decodeEntities(t.name),
      slug: t.slug,
      description: decodeEntities(t.description || ''),
      count: t.count || 0,
    })),
    authors: users.map((u) => ({
      id: u.id,
      name: decodeEntities(u.name),
      slug: u.slug,
      description: decodeEntities(u.description || ''),
    })),
  }
}

async function main() {
  const dataDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const wpJson = (process.env.NEXT_PUBLIC_WORDPRESS_URL ? `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json` : undefined)
  if (!wpJson) {
    console.warn('⚠️  NEXT_PUBLIC_WORDPRESS_URL not set; writing empty data files')
    fs.writeFileSync(OUTPUT_FILE, '[]', 'utf8')
    fs.writeFileSync(
      TAX_FILE,
      JSON.stringify({ categories: [], tags: [], authors: [] }, null, 2),
      'utf8'
    )
    return
  }

  console.log(`🌐 Fetching posts from ${wpJson}...`)
  const posts = await fetchAllPosts(wpJson)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2), 'utf8')
  console.log(
    `✅ Wrote ${posts.length} posts → ${path.relative(ROOT_DIR, OUTPUT_FILE)}`
  )

  console.log('🌐 Fetching taxonomies...')
  const tax = await fetchTaxonomies(wpJson)
  fs.writeFileSync(TAX_FILE, JSON.stringify(tax, null, 2), 'utf8')
  console.log(
    `✅ Wrote ${tax.categories.length} categories, ${tax.tags.length} tags, ${tax.authors.length} authors → ${path.relative(ROOT_DIR, TAX_FILE)}`
  )
}

main().catch((err) => {
  console.error('❌ Error generating blog metadata:', err)
  process.exit(1)
})
