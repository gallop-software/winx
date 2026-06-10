import { readdir, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SRC_DIR = join(__dirname, '../src')
const APP_DIR = join(SRC_DIR, 'app')
const BLOCK_INDEX_PATH = join(
  APP_DIR,
  '(demo)/block/[[...slug]]/_block-index.ts'
)

// Recursively find all _blocks/ directories under src/app/
async function findBlocksDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const results = []

  for (const entry of entries) {
    if (entry.name === '_blocks' && entry.isDirectory()) {
      results.push(join(dir, entry.name))
    } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
      results.push(...(await findBlocksDirs(join(dir, entry.name))))
    }
  }

  return results
}

// Convert route path to URL slug (strip route group parentheses)
function routeToUrlSlug(blocksDir) {
  const relPath = dirname(blocksDir).replace(APP_DIR + '/', '')
  return relPath
    .split('/')
    .filter((seg) => !seg.startsWith('('))
    .join('/')
}

// Collect all block files from all _blocks/ directories
async function collectAllBlocks() {
  const blocksDirs = await findBlocksDirs(APP_DIR)
  const allFiles = []
  const seen = new Set()

  for (const blocksDir of blocksDirs) {
    const urlSlug = routeToUrlSlug(blocksDir)
    const files = (await readdir(blocksDir)).filter((f) => f.endsWith('.tsx'))

    for (const file of files) {
      const blockName = file.replace('.tsx', '')
      const slug = urlSlug ? `${urlSlug}/${blockName}` : blockName

      // Deduplicate by slug (shared blocks appear in multiple routes)
      if (!seen.has(slug)) {
        seen.add(slug)
        allFiles.push({ filename: file, slug, blocksDir })
      }
    }
  }

  return allFiles
}

async function generateBlockIndex(blockFiles) {
  const entries = []

  for (const { slug, blocksDir } of blockFiles) {
    const relFromSrc = blocksDir.replace(SRC_DIR + '/', '')
    const blockName = slug.includes('/') ? slug.split('/').pop() : slug
    const importPath = `@/${relFromSrc}/${blockName}`
    entries.push({ slug, importPath })
  }

  entries.sort((a, b) => a.slug.localeCompare(b.slug))

  const lines = [
    '// Auto-generated — regenerate with: npm run blocks',
    '// Maps demo page slugs to block imports',
    '',
    "import type { ComponentType } from 'react'",
    '',
    'export const blockImports: Record<string, () => Promise<{ default: ComponentType }>> = {',
  ]

  for (const { slug, importPath } of entries) {
    lines.push(`  '${slug}': () => import('${importPath}'),`)
  }

  lines.push('}')
  lines.push('')
  lines.push('export const blockSlugs = Object.keys(blockImports)')
  lines.push('')

  await writeFile(BLOCK_INDEX_PATH, lines.join('\n'), 'utf-8')
  console.log(
    `✓ Block index saved to ${BLOCK_INDEX_PATH} with ${entries.length} entries`
  )
}

async function main() {
  try {
    const blockFiles = await collectAllBlocks()
    console.log(`Found ${blockFiles.length} block files`)
    await generateBlockIndex(blockFiles)
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main()
