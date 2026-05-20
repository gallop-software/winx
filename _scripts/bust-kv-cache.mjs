#!/usr/bin/env node

// Bust the KV cache for likes/shares. Next read per post will rehydrate
// from Postgres.
//
// Usage:
//   npm run bust:kv                          # wipe all posts
//   npm run bust:kv -- --posts=12,34         # wipe specific post IDs
//   npm run bust:kv -- --dry-run             # preview without deleting

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@vercel/kv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

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
const postsArg = args.find((a) => a.startsWith('--posts='))
const POSTS = postsArg
  ? postsArg
      .slice('--posts='.length)
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
  : null

const BLOG_FILE = path.join(ROOT_DIR, '_data/_blog.json')

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`❌ Missing env var: ${name}`)
    process.exit(1)
  }
  return v
}

const kv = createClient({
  url: requireEnv('KV_REST_API_URL'),
  token: requireEnv('KV_REST_API_TOKEN'),
})

function keysForPost(id) {
  return [`likes:${id}`, `like_count:${id}`, `share_count:${id}`]
}

async function main() {
  let ids
  if (POSTS) {
    ids = POSTS
  } else {
    if (!fs.existsSync(BLOG_FILE)) {
      console.error(`❌ ${BLOG_FILE} not found. Run \`npm run blog\` first.`)
      process.exit(1)
    }
    ids = JSON.parse(fs.readFileSync(BLOG_FILE, 'utf8'))
      .map((p) => p.id)
      .filter((n) => Number.isInteger(n) && n > 0)
  }

  console.log(
    `🧹 Busting KV cache for ${ids.length} post(s)${DRY_RUN ? ' (dry run)' : ''}`
  )

  let deleted = 0
  for (const id of ids) {
    const keys = keysForPost(id)
    if (DRY_RUN) {
      console.log(`  would DEL ${keys.join(' ')}`)
      continue
    }
    const n = await kv.del(...keys)
    deleted += Number(n ?? 0)
    console.log(`✓ ${id} → deleted ${n} key(s)`)
  }

  console.log(
    `\n${DRY_RUN ? '🧪' : '✅'} Done. ${deleted} keys removed${DRY_RUN ? ' (no writes)' : ''}.`
  )
}

main().catch((err) => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
