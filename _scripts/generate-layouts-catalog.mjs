import puppeteer from 'puppeteer'
import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  stat,
  unlink,
  access,
} from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
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

const APP_DIR = join(__dirname, '../src/app')
const OUTPUT_DIR = join(__dirname, '../public/layouts')
const README_PATH = join(__dirname, '../src/app/LAYOUTS.md')
const NAVBAR_CONFIG_PATH = join(__dirname, '../src/components/navbar/config.ts')
const BASE_URL = 'https://winx.gallop.software'
const CDN_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || ''
const SCREENSHOT_WIDTH = 2000
const SCREENSHOT_HEIGHT = 1429 // 1.4:1 crop -> 1400x1000 after downscale
const LARGE_SIZE = 1400 // Large image size on longest side
const COLLECTION_PAGE_LIMIT = 1
const BLOG_DATA_PATH = join(__dirname, '../_data/_blog.json')

// Load sample real slugs from _blog.json for dynamic collection routes
// (category/tag/author/search/blog) so we can screenshot a page with content.
let _sampleSlugCache = null
async function loadSampleSlugs() {
  if (_sampleSlugCache) return _sampleSlugCache
  _sampleSlugCache = {}
  try {
    const raw = await readFile(BLOG_DATA_PATH, 'utf8')
    const data = JSON.parse(raw)
    const posts = Array.isArray(data) ? data : data.posts || Object.values(data)
    for (const post of posts) {
      const m = post?.metadata || {}
      if (!_sampleSlugCache.category && m.categorySlugs?.[0]) {
        _sampleSlugCache.category = m.categorySlugs[0]
      }
      if (!_sampleSlugCache.tag && m.tagSlugs?.[0]) {
        _sampleSlugCache.tag = m.tagSlugs[0]
      }
      if (!_sampleSlugCache.author) {
        const a = m.authorSlug || m.authorSlugs?.[0] || m.author
        if (a) _sampleSlugCache.author = a
      }
      if (!_sampleSlugCache.blog) {
        const url = post?.url || post?.permalink
        if (url) _sampleSlugCache.blog = url.replace(/^\//, '')
      }
    }
  } catch {
    // _blog.json missing — fall back to empty
  }
  return _sampleSlugCache
}

// Returns a URL path (relative to BASE_URL) for routes that need a special
// query string or real dynamic slug to render meaningful content.
async function getSpecialUrlPath(folderName) {
  if (folderName === 'search') return 'search?s=leadership'
  const samples = await loadSampleSlugs()
  if (folderName === 'category' && samples.category)
    return `category/${samples.category}`
  if (folderName === 'tag' && samples.tag) return `tag/${samples.tag}`
  if (folderName === 'author' && samples.author)
    return `author/${samples.author}`
  if (folderName === 'blog' && samples.blog) return samples.blog
  return null
}

// Parse navbar config to derive layout ordering
async function parseNavbarOrder() {
  if (!existsSync(NAVBAR_CONFIG_PATH)) {
    console.warn(
      `Warning: ${NAVBAR_CONFIG_PATH} not found — using filesystem order`
    )
    return []
  }
  const configText = await readFile(NAVBAR_CONFIG_PATH, 'utf8')
  const slugs = []
  const seen = new Set()

  // Helper: extract hrefs from a text block
  function extractHrefs(text) {
    const regex = /href:\s*'([^']+)'/g
    const hrefs = []
    let m
    while ((m = regex.exec(text)) !== null) hrefs.push(m[1])
    return hrefs
  }

  // Helper: bracket-match from an opening '[' position, return the block text
  function findBracketBlock(text, openPos) {
    let depth = 0
    for (let i = openPos; i < text.length; i++) {
      if (text[i] === '[') depth++
      if (text[i] === ']') depth--
      if (depth === 0) return text.slice(openPos, i + 1)
    }
    return ''
  }

  // 1. Find Demos items block and extract hrefs first
  const demosIdx = configText.indexOf("label: 'Demos'")
  if (demosIdx === -1) {
    console.warn('Warning: Could not find Demos section in navbar config')
    return []
  }
  const demosItemsIdx = configText.indexOf('items:', demosIdx)
  const demosOpenBracket = configText.indexOf('[', demosItemsIdx)
  const demosBlock = findBracketBlock(configText, demosOpenBracket)

  for (const href of extractHrefs(demosBlock)) {
    if (href.startsWith('/')) {
      const slug = href === '/' ? 'index' : href.slice(1)
      if (!seen.has(slug)) {
        seen.add(slug)
        slugs.push(slug)
      }
    }
  }

  // 2. Collect non-demo items blocks with positions
  const itemsBlocks = []
  const itemsRegex = /items:\s*\[/g
  let im
  while ((im = itemsRegex.exec(configText)) !== null) {
    const openPos = configText.indexOf('[', im.index)
    if (openPos === demosOpenBracket) continue
    itemsBlocks.push({
      position: openPos,
      hrefs: extractHrefs(findBracketBlock(configText, openPos)).filter((h) =>
        h.startsWith('/')
      ),
    })
  }

  // 3. Collect direct link hrefs (links without dropdowns)
  const directLinkRegex = /\{\s*href:\s*'([^']+)',\s*label:\s*'[^']+'\s*\}/g
  const directLinks = []
  let dm
  while ((dm = directLinkRegex.exec(configText)) !== null) {
    if (dm[1].startsWith('/')) {
      directLinks.push({ position: dm.index, hrefs: [dm[1]] })
    }
  }

  // 4. Merge in position order, then add to slugs (deduped against demos)
  const allEntries = [...directLinks, ...itemsBlocks].sort(
    (a, b) => a.position - b.position
  )

  for (const entry of allEntries) {
    for (const href of entry.hrefs) {
      const slug = href === '/' ? 'index' : href.slice(1)
      if (!seen.has(slug)) {
        seen.add(slug)
        slugs.push(slug)
      }
    }
  }

  return slugs
}

// Helper function to convert route folder name to display name and slug
function parseLayoutName(folderName, isHomePage = false) {
  if (isHomePage) {
    return { name: 'index', slug: 'index', displayName: 'Index' }
  }

  const name = folderName
  const slug = name
  const basename = name.split('/').pop()

  // Convert to display name (e.g., "layout-1" -> "Layout 1")
  const displayName = basename
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return { name, slug, displayName }
}

// Helper function to find all layout files that apply to a page path
async function findLayoutsForPage(pagePath) {
  const layouts = []
  const appDir = join(__dirname, '../src/app')

  // Get the relative path from app directory
  const relativePath = pagePath.replace(appDir, '').replace(/^\//, '')
  const parts = relativePath.split('/')

  // Check for layout.tsx at each level, starting from the page's directory going up
  for (let i = parts.length - 1; i >= 0; i--) {
    // Skip the page.tsx file itself
    if (parts[i] === 'page.tsx') continue

    const pathParts = parts.slice(0, i + 1)
    const layoutPath = join(appDir, ...pathParts, 'layout.tsx')

    try {
      await stat(layoutPath)
      // Store relative path from src/app
      const relativeLayoutPath = pathParts.join('/') + '/layout.tsx'
      layouts.push(relativeLayoutPath)
    } catch {
      // layout.tsx doesn't exist at this level
    }
  }

  // Check for root layout.tsx
  const rootLayoutPath = join(appDir, 'layout.tsx')
  try {
    await stat(rootLayoutPath)
    layouts.push('layout.tsx')
  } catch {
    // No root layout
  }

  return layouts
}

// Helper function to find all layout pages in app directory route groups
async function findLayoutPages() {
  const layouts = []
  const BLOCKED_ROUTE_GROUPS = ['(demo)']
  const EXCLUDED_FOLDERS = [
    'api',
    'sitemap_index.xml',
    'search',
    // Files/folders that are not page routes
  ]
  const EXCLUDED_FILES = [
    'error.tsx',
    'not-found.tsx',
    'layout.tsx',
    'loading.tsx',
    'template.tsx',
    'default.tsx',
  ]

  try {
    const entries = await readdir(APP_DIR, { withFileTypes: true })

    for (const entry of entries) {
      // Look for route groups (folders starting with parentheses)
      if (
        entry.isDirectory() &&
        entry.name.startsWith('(') &&
        entry.name.endsWith(')')
      ) {
        // Skip blocked route groups
        if (BLOCKED_ROUTE_GROUPS.includes(entry.name)) {
          continue
        }

        const routeGroupPath = join(APP_DIR, entry.name)
        const routeGroupContents = await readdir(routeGroupPath, {
          withFileTypes: true,
        })

        // Check for home page (page.tsx directly in route group)
        const homePagePath = join(routeGroupPath, 'page.tsx')
        try {
          await stat(homePagePath)
          layouts.push({
            folderName: '', // Empty for home page
            routeGroup: entry.name,
            pagePath: homePagePath,
            isHomePage: true,
          })
        } catch {
          // No home page in this route group
        }

        // Detect [year]/[month]/[slug]/page.tsx blog-post route and surface
        // it as a single "blog" layout that screenshots a real post.
        const blogPostPagePath = join(
          routeGroupPath,
          '[year]',
          '[month]',
          '[slug]',
          'page.tsx'
        )
        try {
          await stat(blogPostPagePath)
          layouts.push({
            folderName: 'blog',
            routeGroup: entry.name,
            pagePath: blogPostPagePath,
            isHomePage: false,
          })
        } catch {
          // No blog-post route in this group
        }

        for (const item of routeGroupContents) {
          // Skip excluded folders
          if (EXCLUDED_FOLDERS.includes(item.name)) {
            continue
          }

          // Skip dynamic route segments like [slug]
          if (item.name.startsWith('[') && item.name.endsWith(']')) {
            continue
          }

          // Skip nested route groups
          if (item.name.startsWith('(') && item.name.endsWith(')')) {
            continue
          }

          // Look for any folder with a page.tsx
          if (item.isDirectory()) {
            const pagePath = join(routeGroupPath, item.name, 'page.tsx')
            try {
              await stat(pagePath)
              layouts.push({
                folderName: item.name,
                routeGroup: entry.name,
                pagePath: pagePath,
                isHomePage: false,
              })
            } catch {
              // No page.tsx here — treat as a "collection" folder and look one level deeper
              const collectionDir = join(routeGroupPath, item.name)
              let subEntries = []
              try {
                subEntries = await readdir(collectionDir, {
                  withFileTypes: true,
                })
              } catch {
                subEntries = []
              }

              // Dynamic-only collection (e.g. category/[slug], tag/[slug],
              // author/[slug]): surface the parent as a single layout and
              // screenshot a real example slug.
              const dynamicPagePath = join(collectionDir, '[slug]', 'page.tsx')
              try {
                await stat(dynamicPagePath)
                layouts.push({
                  folderName: item.name,
                  routeGroup: entry.name,
                  pagePath: dynamicPagePath,
                  isHomePage: false,
                })
                continue
              } catch {
                // no [slug]/page.tsx — fall through to static subfolder logic
              }

              let added = 0
              for (const sub of subEntries) {
                if (added >= COLLECTION_PAGE_LIMIT) break
                if (!sub.isDirectory()) continue
                if (
                  sub.name.startsWith('(') ||
                  sub.name.startsWith('[') ||
                  sub.name.startsWith('_')
                )
                  continue
                if (EXCLUDED_FOLDERS.includes(sub.name)) continue
                const subPagePath = join(collectionDir, sub.name, 'page.tsx')
                try {
                  await stat(subPagePath)
                  layouts.push({
                    folderName: `${item.name}/${sub.name}`,
                    routeGroup: entry.name,
                    pagePath: subPagePath,
                    isHomePage: false,
                  })
                  added++
                } catch {
                  // no page.tsx, skip
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error scanning app directory:', error)
  }

  return layouts
}

async function captureScreenshot(browser, slug, outputDir, urlPath) {
  const page = await browser.newPage()

  try {
    // Set viewport to a standard desktop size
    await page.setViewport({
      width: SCREENSHOT_WIDTH,
      height: SCREENSHOT_HEIGHT,
      deviceScaleFactor: 2, // 2x for sharp/high-DPI screenshots
    })

    // Construct preview URL - layouts are at root level
    const previewUrl = `${BASE_URL}/${urlPath || slug}`

    console.log(`Capturing: ${slug} from ${previewUrl}`)

    // Navigate to the page
    await page.goto(previewUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // Wait a bit for any animations or lazy-loaded content
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Wait for videos (both native and Vimeo iframes) to load and show content
    await page.evaluate(async () => {
      // Handle native video elements
      const videos = document.querySelectorAll('video')
      const videoPromises = Array.from(videos).map((video) => {
        return new Promise((resolve) => {
          // Force video to load by setting preload and autoplay attributes
          video.preload = 'auto'
          video.autoplay = true
          video.muted = true

          // If video has no src attribute but has a source, force reload
          if (!video.src && video.querySelector('source')) {
            video.load()
          }

          // Force the video to load by re-setting its src
          const currentSrc = video.src || video.currentSrc
          if (currentSrc) {
            video.src = currentSrc
            video.load()
          }

          const tryToPlay = () => {
            video.currentTime = 0.5 // Seek a bit further to ensure visible frame
            video.play().catch(() => {})
            // Wait for the video to actually render a frame
            setTimeout(resolve, 1000)
          }

          // If video already has enough data
          if (video.readyState >= 3) {
            tryToPlay()
          } else {
            // Wait for video to load enough data
            const onCanPlay = () => {
              video.removeEventListener('canplay', onCanPlay)
              video.removeEventListener('loadeddata', onCanPlay)
              tryToPlay()
            }
            video.addEventListener('canplay', onCanPlay)
            video.addEventListener('loadeddata', onCanPlay)

            // Timeout after 8 seconds if video doesn't load
            setTimeout(() => {
              video.removeEventListener('canplay', onCanPlay)
              video.removeEventListener('loadeddata', onCanPlay)
              // Try to play anyway
              tryToPlay()
            }, 8000)
          }
        })
      })

      // Handle Vimeo iframes - wait for them to load
      const vimeoIframes = document.querySelectorAll('iframe[src*="vimeo.com"]')
      const vimeoPromises = Array.from(vimeoIframes).map((iframe) => {
        return new Promise((resolve) => {
          // If iframe is already loaded
          if (iframe.contentWindow) {
            // Give Vimeo player time to initialize and buffer
            setTimeout(resolve, 8000)
          } else {
            iframe.addEventListener('load', () => {
              // Give Vimeo player time to initialize and buffer after load
              setTimeout(resolve, 8000)
            })
            // Timeout after 15 seconds
            setTimeout(resolve, 15000)
          }
        })
      })

      await Promise.all([...videoPromises, ...vimeoPromises])
    })

    // Additional wait to ensure video frames are rendered
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Neutralize internal scroll containers (e.g. sticky side sections) so
    // their full content is visible in the tall crop instead of just their
    // initial viewport.
    await page.evaluate(() => {
      const els = document.querySelectorAll('*')
      for (const el of els) {
        const style = getComputedStyle(el)
        const overflowY = style.overflowY
        const isScrollable =
          (overflowY === 'auto' || overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 1
        const isSticky = style.position === 'sticky'
        if (isScrollable || isSticky) {
          el.style.setProperty('overflow', 'visible', 'important')
          el.style.setProperty('max-height', 'none', 'important')
          el.style.setProperty('height', 'auto', 'important')
          if (isSticky) {
            el.style.setProperty('position', 'static', 'important')
          }
        }
      }
    })

    // Brief reflow wait after style overrides
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Take screenshot of the top portion as buffer (tall screenshot)
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 90,
      clip: {
        x: 0,
        y: 0,
        width: SCREENSHOT_WIDTH,
        height: SCREENSHOT_HEIGHT,
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

async function cleanupOrphanedScreenshots(currentLayoutSlugs, outputDir) {
  const orphanedSlugs = []
  let deletedCount = 0

  // Read all files in the output directory (recursive so nested collection folders are included)
  let screenshotFiles = []
  try {
    screenshotFiles = await readdir(outputDir, { recursive: true })
  } catch {
    // Output directory doesn't exist yet
    return { orphanedSlugs, deletedCount }
  }

  // Get unique slugs from screenshot files
  const screenshotSlugs = new Set()
  for (const file of screenshotFiles) {
    if (file.endsWith('.jpg')) {
      const slug = file.replace('.jpg', '')
      screenshotSlugs.add(slug)
    }
  }

  // Find orphaned screenshots (exist as images but no corresponding layout)
  for (const slug of screenshotSlugs) {
    if (!currentLayoutSlugs.has(slug)) {
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

async function generateLayoutsCatalog(mode = 'smart') {
  try {
    console.log('Starting layouts catalog generation...\n')

    // Find all layout pages in app directory route groups
    const layoutPages = await findLayoutPages()

    console.log(`Found ${layoutPages.length} layout pages\n`)

    // Parse all layout files
    const layouts = []
    for (const layoutPage of layoutPages) {
      const { name, slug, displayName } = parseLayoutName(
        layoutPage.folderName,
        layoutPage.isHomePage
      )

      // All layouts in this template are pro
      const tier = 'pro'

      // Find all layout files that apply to this page
      const layoutFiles = await findLayoutsForPage(layoutPage.pagePath)

      const urlPath = await getSpecialUrlPath(layoutPage.folderName)
      // For dynamic routes, embed the example slug in the screenshot path
      // (e.g. tag/company-building.jpg) so the filename matches the URL.
      const finalSlug = urlPath ? urlPath.split('?')[0] : slug

      layouts.push({
        name,
        slug: finalSlug,
        displayName,
        tier,
        routeGroup: layoutPage.routeGroup,
        pagePath: layoutPage.pagePath,
        isHomePage: layoutPage.isHomePage,
        layoutFiles,
        ...(urlPath ? { urlPath } : {}),
      })
    }

    // Sort layouts based on navbar config order
    const navbarOrder = await parseNavbarOrder()
    const layoutMap = new Map(layouts.map((l) => [l.slug, l]))
    const sorted = []

    // Add layouts in navbar order
    for (const slug of navbarOrder) {
      const layout = layoutMap.get(slug)
      if (layout) {
        sorted.push(layout)
        layoutMap.delete(slug)
      }
    }

    // Append any remaining layouts not in navbar
    for (const layout of layoutMap.values()) {
      sorted.push(layout)
    }

    layouts.length = 0
    layouts.push(...sorted)

    // Check for orphaned screenshots (images without corresponding layout pages)
    const currentLayoutSlugs = new Set(layouts.map((l) => l.slug))
    const { orphanedSlugs, deletedCount } = await cleanupOrphanedScreenshots(
      currentLayoutSlugs,
      OUTPUT_DIR
    )

    if (orphanedSlugs.length > 0) {
      console.log(
        `\nCleaned up ${orphanedSlugs.length} orphaned layouts: ${orphanedSlugs.join(', ')}`
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

    // Determine which layouts need screenshots
    let layoutsToCapture = []

    if (mode === 'force') {
      // Force mode: capture all layouts
      layoutsToCapture = layouts
      console.log('Force mode: capturing all layouts\n')
    } else if (mode === 'smart') {
      // Smart mode: only capture missing images
      console.log('Checking for existing images...\n')
      for (const layout of layouts) {
        const exists = await imageExists(layout.slug, OUTPUT_DIR)
        if (!exists) {
          layoutsToCapture.push(layout)
        } else {
          layout.hasScreenshot = true
        }
      }

      if (layoutsToCapture.length === 0) {
        console.log(
          'All layout images already exist, skipping screenshot capture\n'
        )
      } else {
        console.log(`Found ${layoutsToCapture.length} layouts without images\n`)
      }
    } else {
      // Skip mode: don't capture any
      console.log('Skipping screenshot capture\n')
      layouts.forEach((layout) => (layout.hasScreenshot = true))
    }

    // Capture screenshots if needed
    if (layoutsToCapture.length > 0) {
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
      for (const layout of layoutsToCapture) {
        const success = await captureScreenshot(
          browser,
          layout.slug,
          OUTPUT_DIR,
          layout.urlPath
        )

        if (success) {
          successCount++
          layout.hasScreenshot = true
        } else {
          errorCount++
          layout.hasScreenshot = false
        }
      }

      await browser.close()

      console.log('\n=== Screenshot Capture Complete ===')
      console.log(`✓ Successful: ${successCount}`)
      console.log(`✗ Failed: ${errorCount}`)
      console.log(`Total captured: ${layoutsToCapture.length}\n`)
    }

    // Generate LAYOUTS.md
    console.log('Generating LAYOUTS.md...')
    const readme = generateReadme(layouts)
    await writeFile(README_PATH, readme, 'utf8')
    console.log(`✓ LAYOUTS.md saved to ${README_PATH}\n`)

    console.log('=== Layouts Catalog Generation Complete ===')
    console.log(`\nView LAYOUTS.md at: ${README_PATH}`)
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

function generateReadme(layouts) {
  const freeLayouts = layouts.filter((l) => l.tier === 'free')
  const proLayouts = layouts.filter((l) => l.tier === 'pro')

  let readme = `# Winx Layouts\n\n`
  readme += `A collection of ${layouts.length} pre-built page layouts for the Winx template.\n\n`
  readme += `## Overview\n\n`
  readme += `- **Total Layouts:** ${layouts.length}\n`
  readme += `- **Free Layouts:** ${freeLayouts.length}\n`
  readme += `- **Pro Layouts:** ${proLayouts.length}\n\n`

  readme += `## Layouts\n\n`

  layouts.forEach((layout) => {
    readme += `#### ${layout.displayName}\n\n`
    if (layout.hasScreenshot) {
      readme += `<img src="${CDN_URL}/layouts/${layout.slug}.jpg" alt="${layout.displayName}" width="350">\n\n`
    }
    const displaySlug = layout.urlPath || layout.slug
    readme += `**Slug:** \`${displaySlug}\`  \n`
    // Generate relative path from src/app
    const relativePath = layout.pagePath.replace(/.*\/src\/app\//, '')
    readme += `**Path:** \`${relativePath}\`  \n`
    // Output each layout file path
    if (layout.layoutFiles && layout.layoutFiles.length > 0) {
      layout.layoutFiles.forEach((layoutFile) => {
        readme += `**Layout:** \`${layoutFile}\`  \n`
      })
    }
    readme += `**Tier:** ${layout.tier.charAt(0).toUpperCase() + layout.tier.slice(1)}\n\n`
    readme += `---\n\n`
  })

  return readme
}

// Run the script
let mode = 'skip'

if (process.argv.includes('--screenshots')) {
  mode = 'force'
}

generateLayoutsCatalog(mode)
