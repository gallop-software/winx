#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

const BLOG_FILE = path.join(ROOT_DIR, '_data/_blog.json')
const CONCURRENCY = 5

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

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const onlyArg = args.find((a) => a.startsWith('--only='))
const ONLY = onlyArg
  ? new Set(
      onlyArg
        .slice('--only='.length)
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    )
  : null

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`❌ Missing env var: ${name}`)
    process.exit(1)
  }
  return v
}

const SHARE_THIS_URL = requireEnv('SHARE_THIS_URL').replace(/\/+$/, '')
const DATABASE_URL = requireEnv('DATABASE_URL')

const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function fetchShareCount(post) {
  const url = `${SHARE_THIS_URL}${post.url}/`
  const endpoint = `https://count-server.sharethis.com/v2.0/get_counts?url=${encodeURIComponent(url)}`
  try {
    const res = await fetch(endpoint)
    if (!res.ok) return { ok: false, count: 0, error: `HTTP ${res.status}` }
    const data = await res.json()
    return { ok: true, count: Number(data.total) || 0 }
  } catch (err) {
    return { ok: false, count: 0, error: String(err) }
  }
}

async function upsertSeed(postId, count) {
  await prisma.blogPostSeed.upsert({
    where: { post_id: postId },
    create: { post_id: postId, seed_count: count, seeded_at: new Date() },
    update: { seed_count: count, seeded_at: new Date() },
  })
}

async function runWithConcurrency(items, limit, worker) {
  const queue = items.slice()
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()
      if (!item) break
      await worker(item)
    }
  })
  await Promise.all(workers)
}

async function main() {
  if (!fs.existsSync(BLOG_FILE)) {
    console.error(`❌ ${BLOG_FILE} not found. Run \`npm run blog\` first.`)
    process.exit(1)
  }

  const allPosts = JSON.parse(fs.readFileSync(BLOG_FILE, 'utf8'))
  const posts = allPosts.filter((p) => {
    if (!p.id || !p.url) return false
    if (ONLY && !ONLY.has(p.id)) return false
    return true
  })

  console.log(
    `🌱 Seeding share counts for ${posts.length} post(s)${DRY_RUN ? ' (dry run)' : ''}${
      ONLY ? ` [filter: ${[...ONLY].join(',')}]` : ''
    }`
  )

  let ok = 0
  let failed = 0
  let total = 0

  await runWithConcurrency(posts, CONCURRENCY, async (post) => {
    const result = await fetchShareCount(post)
    if (!result.ok) {
      failed++
      console.warn(`⚠️  ${post.id} ${post.slug} — fetch failed: ${result.error}`)
      return
    }
    total += result.count
    if (!DRY_RUN) {
      try {
        await upsertSeed(post.id, result.count)
      } catch (err) {
        failed++
        console.warn(`⚠️  ${post.id} ${post.slug} — db upsert failed: ${err}`)
        return
      }
    }
    ok++
    console.log(`✓ ${post.id} ${post.slug} → ${result.count}`)
  })

  console.log(
    `\n${DRY_RUN ? '🧪' : '✅'} Done. Seeded ${ok}, failed ${failed}, total share-count sum: ${total}${
      DRY_RUN ? ' (no DB writes)' : ''
    }`
  )
  if (failed > 0) process.exit(1)
}

main()
  .catch((err) => {
    console.error('❌ Fatal:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
