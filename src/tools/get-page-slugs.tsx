import { readdirSync, statSync, existsSync } from 'fs'
import path from 'path'

type PageSlugItem = {
  slug: string
  modified: string
  uri: string
}

const BLOCKED_ROUTE_GROUPS = ['(demo)']
const EXCLUDED_FOLDERS = [
  'api',
  'post', // Posts are handled separately
]

export async function getPageSlugs(): Promise<{ pageSlugs: PageSlugItem[] }> {
  const appDir = path.join(process.cwd(), 'src/app')
  const out: PageSlugItem[] = []

  function scanRouteGroup(routeGroupPath: string): void {
    const entries = readdirSync(routeGroupPath, { withFileTypes: true })

    // Check for home page (page.tsx directly in route group)
    const homePagePath = path.join(routeGroupPath, 'page.tsx')
    if (existsSync(homePagePath)) {
      const stats = statSync(homePagePath)
      out.push({
        slug: '',
        modified: stats.mtime.toISOString(),
        uri: '/',
      })
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (EXCLUDED_FOLDERS.includes(entry.name)) continue
      if (entry.name.startsWith('[') && entry.name.endsWith(']')) continue
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) continue

      const pagePath = path.join(routeGroupPath, entry.name, 'page.tsx')
      if (existsSync(pagePath)) {
        const stats = statSync(pagePath)
        out.push({
          slug: entry.name,
          modified: stats.mtime.toISOString(),
          uri: '/' + entry.name,
        })
      }
    }
  }

  // Scan all route groups in app directory
  const appEntries = readdirSync(appDir, { withFileTypes: true })
  for (const entry of appEntries) {
    if (
      entry.isDirectory() &&
      entry.name.startsWith('(') &&
      entry.name.endsWith(')')
    ) {
      if (BLOCKED_ROUTE_GROUPS.includes(entry.name)) continue
      scanRouteGroup(path.join(appDir, entry.name))
    }
  }

  // Remove duplicate home pages (keep first one)
  const seen = new Set<string>()
  const unique = out.filter((item) => {
    if (seen.has(item.uri)) return false
    seen.add(item.uri)
    return true
  })

  return { pageSlugs: unique }
}
