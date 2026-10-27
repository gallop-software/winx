import 'server-only'
import { cache } from 'react'
import { baseURL, schemaIds } from '@/app/metadata'
import type { PageMetadata } from '@/utils/page-helpers'
import { getPageAncestors, getPageByPath, type SitePage } from '@/utils/pages'
import { getWordPressPage, type PostData } from '@/utils/post-cache'
import { resolvePostSeo } from '@/utils/post-seo'
import { buildPageSchema } from '@/utils/structured-data'

// What a WordPress page's page needs, read once for the metadata and the
// page: its row in the content index, which says the path is a page, its
// parents, and its body from the post cache.

export type LoadedPage = {
  page: SitePage
  ancestors: SitePage[]
  data: PostData
}

export const loadWordPressPage = cache(
  async (path: string): Promise<LoadedPage | null> => {
    const page = await getPageByPath(path)
    if (!page) return null
    const [ancestors, data] = await Promise.all([
      getPageAncestors(page),
      getWordPressPage(page.path),
    ])
    if (!data) return null
    return { page, ancestors, data }
  }
)

type PageSchemaType = NonNullable<Parameters<typeof buildPageSchema>[0]['type']>

// A few pages are about the site's author, which search engines are told.
function schemaType(path: string): {
  type: PageSchemaType
  mainEntity?: string
} {
  if (path === '/about')
    return { type: 'AboutPage', mainEntity: schemaIds.author }
  return { type: 'WebPage' }
}

export function wordPressPageMetadata({
  page,
  ancestors,
  data,
}: LoadedPage): PageMetadata {
  const path = `${page.path}/`
  const seo = resolvePostSeo(data, null, path)
  const { type, mainEntity } = schemaType(page.path)
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    ...(seo.robots ? { robots: seo.robots } : {}),
    openGraph: {
      type: 'website',
      url: `${baseURL}${path}`,
      title: seo.shareTitle,
      description: seo.shareDescription,
      ...(seo.image ? { image: seo.image } : {}),
    },
    structuredData: buildPageSchema({
      url: path,
      title: seo.headline,
      description: seo.description,
      type,
      ...(mainEntity ? { mainEntity } : {}),
      ...(seo.image ? { image: { ...seo.image, caption: seo.image.alt } } : {}),
      ...(seo.datePublished ? { datePublished: seo.datePublished } : {}),
      ...(seo.dateModified ? { dateModified: seo.dateModified } : {}),
      breadcrumbs: [
        { name: 'Home', href: '/' },
        ...ancestors.map((parent) => ({
          name: parent.title,
          href: `${parent.path}/`,
        })),
        { name: seo.headline, href: path },
      ],
    }),
  }
}
