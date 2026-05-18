export interface SitemapEntry {
  url: string
  lastmod?: string
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (entry) => {
        const url = entry.url.endsWith('/') ? entry.url : `${entry.url}/`
        return `  <url>\n    <loc>${url}</loc>${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''}\n  </url>`
      }
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}

export function buildSitemapIndexXml(
  sitemaps: { loc: string; lastmod?: string }[]
): string {
  const entries = sitemaps
    .map(
      (s) =>
        `  <sitemap>\n    <loc>${s.loc}</loc>${s.lastmod ? `\n    <lastmod>${s.lastmod}</lastmod>` : ''}\n  </sitemap>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`
}

export function xmlResponse(xml: string) {
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
