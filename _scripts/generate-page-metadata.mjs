#!/usr/bin/env node

// Scans src/app for static page routes and writes _data/_pages.json.
//
// This has to happen at build time: the page sitemap needs each route's URI and
// last-modified date, and there is no filesystem to scan on Cloudflare Workers.
// src/tools/get-page-slugs.tsx imports the generated JSON instead.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

const APP_DIR = path.join(ROOT_DIR, 'src/app')
const OUTPUT_FILE = path.join(ROOT_DIR, '_data/_pages.json')

const BLOCKED_ROUTE_GROUPS = ['(demo)']
const EXCLUDED_FOLDERS = [
  'api',
  'post', // Posts are handled separately
]

function scanRouteGroup(routeGroupPath, out) {
  const entries = fs.readdirSync(routeGroupPath, { withFileTypes: true })

  // Check for home page (page.tsx directly in route group)
  const homePagePath = path.join(routeGroupPath, 'page.tsx')
  if (fs.existsSync(homePagePath)) {
    out.push({
      slug: '',
      modified: fs.statSync(homePagePath).mtime.toISOString(),
      uri: '/',
    })
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (EXCLUDED_FOLDERS.includes(entry.name)) continue
    if (entry.name.startsWith('[') && entry.name.endsWith(']')) continue
    if (entry.name.startsWith('(') && entry.name.endsWith(')')) continue

    const pagePath = path.join(routeGroupPath, entry.name, 'page.tsx')
    if (fs.existsSync(pagePath)) {
      out.push({
        slug: entry.name,
        modified: fs.statSync(pagePath).mtime.toISOString(),
        uri: '/' + entry.name,
      })
    }
  }
}

function main() {
  const out = []

  for (const entry of fs.readdirSync(APP_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (!(entry.name.startsWith('(') && entry.name.endsWith(')'))) continue
    if (BLOCKED_ROUTE_GROUPS.includes(entry.name)) continue
    scanRouteGroup(path.join(APP_DIR, entry.name), out)
  }

  // Remove duplicate home pages (keep first one)
  const seen = new Set()
  const pages = out.filter((item) => {
    if (seen.has(item.uri)) return false
    seen.add(item.uri)
    return true
  })

  const dataDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pages, null, 2) + '\n', 'utf8')

  console.log(
    `✅ Wrote ${pages.length} pages → ${path.relative(ROOT_DIR, OUTPUT_FILE)}`
  )
}

main()
