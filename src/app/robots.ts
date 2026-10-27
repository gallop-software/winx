import { baseURL, noIndex } from '@/app/metadata'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  if (noIndex) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/account/', '/block/'],
      },
    ],
    sitemap: `${baseURL}/sitemap_index.xml`,
  }
}
