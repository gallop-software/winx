export interface SitemapEntry {
  url: string
  lastmod?: string
}

// An address as XML text: "&" and the like would end the document early.
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// WordPress's GMT time ("2026-08-08T18:54:03", or with a space) as the W3C
// date a sitemap takes. Undefined when there is none.
export function sitemapDate(gmt: string | null | undefined): string | undefined {
  const match = gmt?.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/)
  if (!match || match[1] === '0000-00-00') return undefined
  return `${match[1]}T${match[2]}+00:00`
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const url = entry.url.endsWith('/') ? entry.url : `${entry.url}/`
      return `  <url>\n    <loc>${escapeXml(url)}</loc>${entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ''}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}

export function buildSitemapIndexXml(
  sitemaps: { loc: string; lastmod?: string }[]
): string {
  const entries = sitemaps
    .map(
      (s) =>
        `  <sitemap>\n    <loc>${escapeXml(s.loc)}</loc>${s.lastmod ? `\n    <lastmod>${escapeXml(s.lastmod)}</lastmod>` : ''}\n  </sitemap>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`
}

export function xmlResponse(xml: string, type = 'application/xml') {
  return new Response(xml, {
    headers: { 'Content-Type': `${type}; charset=utf-8` },
  })
}
