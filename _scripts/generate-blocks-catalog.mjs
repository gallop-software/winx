import puppeteer from 'puppeteer'
import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  unlink,
  access,
} from 'fs/promises'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { exec } from 'child_process'
import { promisify } from 'util'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env.local') })

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SRC_DIR = join(__dirname, '../src')
const APP_DIR = join(SRC_DIR, 'app')
const OUTPUT_DIR = join(__dirname, '../public/blocks')
const README_PATH = join(APP_DIR, 'BLOCKS.md')
const BLOCK_INDEX_PATH = join(
  APP_DIR,
  '(demo)/block/[[...slug]]/_block-index.ts'
)
const BASE_URL = 'https://winx.gallop.software'
const CDN_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || ''
const LARGE_SIZE = 1400 // Large image size on longest side

function sortCategories(categories) {
  return categories.sort((a, b) => a.localeCompare(b))
}

// Helper function to get full category display name
function getCategoryDisplayName(category) {
  // Convert category slug to display name (e.g., "call-to-action" -> "Call To Action")
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Helper function to recursively find all _blocks/ directories under src/app/
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

const LAYOUTS_README_PATH = join(APP_DIR, 'LAYOUTS.md')

// Parse layout order and tiers from src/app/LAYOUTS.md (single source of truth)
async function parseLayoutOrder() {
  let readme
  try {
    readme = await readFile(LAYOUTS_README_PATH, 'utf8')
  } catch {
    console.error('Layout file not found. Run `npm run layouts` first.')
    process.exit(1)
  }

  const layoutRegex =
    /\*\*Slug:\*\*\s+`([^`]+)`[\s\S]*?\*\*Tier:\*\*\s+(Free|Pro)/g
  const order = []
  const tiers = new Map()
  let match
  while ((match = layoutRegex.exec(readme)) !== null) {
    const prefix = match[1] === 'index' ? '' : match[1]
    order.push(prefix)
    tiers.set(prefix, match[2].toLowerCase())
  }
  return { order, tiers }
}

// Extract route prefix from a block slug (e.g. "furniture/hero" -> "furniture", "hero" -> "")
function getRoutePrefix(slug) {
  const lastSlash = slug.lastIndexOf('/')
  return lastSlash === -1 ? '' : slug.substring(0, lastSlash)
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

      // Deduplicate by slug (shared blocks like cover/testimonial appear in multiple routes)
      if (!seen.has(slug)) {
        seen.add(slug)
        allFiles.push({ filename: file, slug, blocksDir })
      }
    }
  }

  return allFiles
}

// Helper function to convert filename to display name and slug
function parseBlockName(filename, slug) {
  const name = filename.replace('.tsx', '')

  // Convert to display name (e.g., "furniture/hero" -> "Furniture Hero")
  const displayName = slug
    .split('/')
    .map((part) =>
      part
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' / ')

  return { name, slug, displayName }
}

async function captureScreenshot(browser, slug, outputDir) {
  const page = await browser.newPage()

  try {
    // Set viewport to a standard desktop size
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1.5, // For retina/high-DPI screenshots
    })

    // Construct preview URL
    const previewUrl = `${BASE_URL}/block/${slug}`

    console.log(`Capturing: ${slug} from ${previewUrl}`)

    // Navigate to the page
    await page.goto(previewUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // Wait a bit for any animations or lazy-loaded content
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Force lazy-loaded images to load: scroll through the page, flip
    // loading="lazy" → "eager", and wait for all images to finish decoding.
    await page.evaluate(async () => {
      const step = window.innerHeight
      const total = document.body.scrollHeight
      for (let y = 0; y < total; y += step) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 100))
      }
      window.scrollTo(0, 0)

      for (const img of document.querySelectorAll('img')) {
        img.loading = 'eager'
        if (img.dataset.src && !img.src) img.src = img.dataset.src
      }

      await Promise.all(
        Array.from(document.querySelectorAll('img')).map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve()
          return new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true })
            img.addEventListener('error', resolve, { once: true })
            setTimeout(resolve, 8000)
          })
        })
      )
    })

    // Brief reflow wait after force-load
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Get the actual content height to avoid extra bottom whitespace
    const bodyHeight = await page.evaluate(() => {
      return document.body.scrollHeight
    })

    // Take screenshot as buffer
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 90,
      clip: {
        x: 0,
        y: 0,
        width: 1920,
        height: Math.min(bodyHeight, 10000), // Cap at reasonable height
      },
    })

    // Get original image dimensions
    const metadata = await sharp(screenshotBuffer).metadata()
    const { width, height } = metadata

    // Helper function to calculate dimensions for a target size
    const calculateDimensions = (targetSize) => {
      const longestSide = Math.max(width, height)
      if (longestSide <= targetSize) {
        return { w: width, h: height }
      } else if (width > height) {
        return { w: targetSize, h: Math.round((height / width) * targetSize) }
      } else {
        return { w: Math.round((width / height) * targetSize), h: targetSize }
      }
    }

    // Calculate dimensions for large size
    const large = calculateDimensions(LARGE_SIZE)

    // Save large image (1400px)
    const largeImagePath = join(outputDir, `${slug}.jpg`)
    await mkdir(dirname(largeImagePath), { recursive: true })
    await sharp(screenshotBuffer)
      .resize(large.w, large.h, { fit: 'inside' })
      .jpeg({ quality: 90 })
      .toFile(largeImagePath)

    console.log(`✓ Saved: ${slug}.jpg (${large.w}x${large.h})`)
    return true
  } catch (error) {
    console.error(`✗ Error capturing ${slug}:`, error.message)
    return false
  } finally {
    await page.close()
  }
}

async function imageExists(slug, outputDir) {
  try {
    const imagePath = join(outputDir, `${slug}.jpg`)
    await access(imagePath)
    return true
  } catch {
    return false
  }
}

async function findScreenshots(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const results = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await findScreenshots(fullPath, base)))
    } else if (entry.name.endsWith('.jpg')) {
      const rel = fullPath.replace(base + '/', '').replace('.jpg', '')
      results.push(rel)
    }
  }

  return results
}

async function cleanupOrphanedScreenshots(currentBlockSlugs, outputDir) {
  const orphanedSlugs = []
  let deletedCount = 0

  // Find all screenshot files recursively
  let screenshotSlugs
  try {
    screenshotSlugs = await findScreenshots(outputDir)
  } catch {
    // Output directory doesn't exist yet
    return { orphanedSlugs, deletedCount }
  }

  // Find orphaned screenshots (exist as images but no corresponding block file)
  for (const slug of screenshotSlugs) {
    if (!currentBlockSlugs.has(slug)) {
      orphanedSlugs.push(slug)

      const imagePath = join(outputDir, `${slug}.jpg`)

      try {
        await access(imagePath)
        await unlink(imagePath)
        console.log(`✓ Deleted orphaned screenshot: ${slug}.jpg`)
        deletedCount++
      } catch {
        // File doesn't exist
      }
    }
  }

  return { orphanedSlugs, deletedCount }
}

async function generateBlocksCatalog(mode = 'smart', filterBlock = null) {
  try {
    console.log('Starting blocks catalog generation...\n')

    // Collect all block files from _blocks/ directories
    let blockFiles = await collectAllBlocks()

    // Filter to single block if specified
    if (filterBlock) {
      blockFiles = blockFiles.filter((f) => f.slug === filterBlock)
      if (blockFiles.length === 0) {
        console.error(`Error: Block "${filterBlock}" not found`)
        process.exit(1)
      }
      console.log(`Filtering to single block: ${filterBlock}\n`)
    }

    console.log(`Found ${blockFiles.length} block files\n`)

    // Parse layout order and tiers from src/app/LAYOUTS.md
    const { order: layoutOrder, tiers: layoutTiers } = await parseLayoutOrder()
    console.log(`Loaded layout order: ${layoutOrder.length} pages\n`)

    // Parse all block files, derive tier from layout
    const allBlocksMap = new Map()
    for (const blockFile of blockFiles) {
      const { name, slug, displayName } = parseBlockName(
        blockFile.filename,
        blockFile.slug
      )
      const routePrefix = getRoutePrefix(slug)
      const tier = layoutTiers.get(routePrefix) || 'free'

      allBlocksMap.set(displayName, {
        name,
        slug,
        displayName,
        tier,
        filename: blockFile.filename,
        blocksDir: blockFile.blocksDir,
      })
    }

    // Sort blocks by layout order within each category
    const blocks = []

    // Get all categories and sort them by preferred order
    const allCategories = new Set()
    for (const block of allBlocksMap.values()) {
      allCategories.add(block.name.replace(/-\d+$/, ''))
    }
    const sortedCategories = sortCategories([...allCategories])

    for (const category of sortedCategories) {
      const categoryBlocks = []
      for (const block of allBlocksMap.values()) {
        if (block.name.replace(/-\d+$/, '') === category) {
          categoryBlocks.push(block)
        }
      }

      categoryBlocks.sort((a, b) => {
        const prefixA = getRoutePrefix(a.slug)
        const prefixB = getRoutePrefix(b.slug)

        if (prefixA !== prefixB) return prefixA.localeCompare(prefixB)

        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      })

      blocks.push(...categoryBlocks)
    }

    // Check for orphaned screenshots (skip when filtering to single block)
    if (!filterBlock) {
      const currentBlockSlugs = new Set(blocks.map((b) => b.slug))
      const { orphanedSlugs, deletedCount } = await cleanupOrphanedScreenshots(
        currentBlockSlugs,
        OUTPUT_DIR
      )

      if (orphanedSlugs.length > 0) {
        console.log(
          `\nCleaned up ${orphanedSlugs.length} orphaned blocks: ${orphanedSlugs.join(', ')}`
        )

        if (deletedCount > 0) {
          console.log(`Deleted ${deletedCount} orphaned screenshot files`)
          console.log('\nRunning npm run images to update processed images...')
          try {
            const { stdout, stderr } = await execAsync('npm run images', {
              cwd: join(__dirname, '..'),
            })
            if (stdout) console.log(stdout)
            console.log('✓ Image processing complete\n')
          } catch (error) {
            console.error('Warning: npm run images failed:', error.message)
          }
        }
      }
    }

    // Determine which blocks need screenshots
    let blocksToCapture = []

    if (mode === 'force') {
      // Force mode: capture all blocks
      blocksToCapture = blocks
      console.log('Force mode: capturing all blocks\n')
    } else if (mode === 'smart') {
      // Smart mode: only capture missing images
      console.log('Checking for existing images...\n')
      for (const block of blocks) {
        const exists = await imageExists(block.slug, OUTPUT_DIR)
        if (!exists) {
          blocksToCapture.push(block)
        } else {
          block.hasScreenshot = true
        }
      }

      if (blocksToCapture.length === 0) {
        console.log(
          'All block images already exist, skipping screenshot capture\n'
        )
      } else {
        console.log(`Found ${blocksToCapture.length} blocks without images\n`)
      }
    } else {
      // Skip mode: don't capture any
      console.log('Skipping screenshot capture\n')
      blocks.forEach((block) => (block.hasScreenshot = true))
    }

    // Capture screenshots if needed
    if (blocksToCapture.length > 0) {
      await mkdir(OUTPUT_DIR, { recursive: true })

      // Launch browser for screenshots
      console.log('Launching browser...\n')
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      let successCount = 0
      let errorCount = 0

      // Capture screenshots
      for (const block of blocksToCapture) {
        const success = await captureScreenshot(browser, block.slug, OUTPUT_DIR)

        if (success) {
          successCount++
          block.hasScreenshot = true
        } else {
          errorCount++
          block.hasScreenshot = false
        }
      }

      await browser.close()

      console.log('\n=== Screenshot Capture Complete ===')
      console.log(`✓ Successful: ${successCount}`)
      console.log(`✗ Failed: ${errorCount}`)
      console.log(`Total captured: ${blocksToCapture.length}\n`)
    }

    // Generate README and block index (skip when filtering to single block)
    if (!filterBlock) {
      console.log('Generating README...')
      const readme = generateReadme(blocks)
      await writeFile(README_PATH, readme, 'utf8')
      console.log(`✓ README saved to ${README_PATH}\n`)

      console.log('Generating block index...')
      await generateBlockIndex(blockFiles)
    }

    console.log('=== Blocks Catalog Generation Complete ===')
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
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
    `✓ Block index saved to ${BLOCK_INDEX_PATH} with ${entries.length} entries\n`
  )
}

function generateReadme(blocks) {
  const freeBlocks = blocks.filter((b) => b.tier === 'free')
  const proBlocks = blocks.filter((b) => b.tier === 'pro')

  let readme = `# Winx Blocks\n\n`
  readme += `A collection of ${blocks.length} pre-built UI blocks for the Winx template.\n\n`
  readme += `## Overview\n\n`
  readme += `- **Total Blocks:** ${blocks.length}\n`
  readme += `- **Free Blocks:** ${freeBlocks.length}\n`
  readme += `- **Pro Blocks:** ${proBlocks.length}\n\n`

  // Group blocks by category
  const categories = {}
  blocks.forEach((block) => {
    const category = block.name.replace(/-\d+$/, '')
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(block)
  })

  readme += `## Categories\n\n`
  sortCategories(Object.keys(categories)).forEach((category) => {
    readme += `- **${getCategoryDisplayName(category)}:** ${categories[category].length} blocks\n`
  })
  readme += `\n`

  readme += `## Blocks\n\n`

  // Group blocks by category while preserving order within each category
  const blocksByCategory = {}
  blocks.forEach((block) => {
    const category = block.name.replace(/-\d+$/, '')
    if (!blocksByCategory[category]) {
      blocksByCategory[category] = []
    }
    blocksByCategory[category].push(block)
  })

  // Output blocks grouped by category (categories sorted by preferred order)
  sortCategories(Object.keys(blocksByCategory)).forEach((category) => {
    readme += `### ${getCategoryDisplayName(category)}\n\n`

    blocksByCategory[category].forEach((block) => {
      readme += `#### ${block.displayName}\n\n`
      if (block.hasScreenshot) {
        readme += `<img src="${CDN_URL}/blocks/${block.slug}.jpg" alt="${block.displayName}" width="350">\n\n`
      }
      readme += `**Slug:** \`${block.slug}\`  \n`
      readme += `**Path:** \`${relative(APP_DIR, join(block.blocksDir, block.filename))}\`  \n`
      readme += `**Tier:** ${block.tier.charAt(0).toUpperCase() + block.tier.slice(1)}\n\n`
      readme += `---\n\n`
    })
  })

  return readme
}

// Run the script
let mode = 'skip'
let filterBlock = null

if (process.argv.includes('--screenshots')) {
  mode = 'force'
}

// Parse --block=name argument to filter to a single block
const blockArg = process.argv.find((arg) => arg.startsWith('--block='))
if (blockArg) {
  filterBlock = blockArg.split('=')[1]
}

generateBlocksCatalog(mode, filterBlock)
