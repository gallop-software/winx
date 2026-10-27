import 'server-only'
import { cache } from 'react'
import { baseURL } from '@/app/metadata'
import { getPostByUrl, type BlogPost } from '@/utils/content-index'
import type { PageMetadata } from '@/utils/page-helpers'
import { getPost, type PostData } from '@/utils/post-cache'
import { resolvePostSeo } from '@/utils/post-seo'

// What a post's page needs: the post from the post cache and its entry in
// the content index, read once for the metadata and the page.

export type LoadedPost = { data: PostData; entry: BlogPost | null }

export const loadPost = cache(
  async (
    year: string,
    month: string,
    slug: string
  ): Promise<LoadedPost | null> => {
    const data = await getPost(slug, year, month)
    if (!data) return null
    const entry = await getPostByUrl(`/${year}/${month}/${slug}/`)
    return { data, entry }
  }
)

export function postMetadata(
  { data, entry }: LoadedPost,
  path: string
): PageMetadata {
  const seo = resolvePostSeo(data, entry, path)
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    ...(seo.tags.length ? { keywords: seo.tags } : {}),
    ...(seo.author.name
      ? {
          authors: [
            {
              name: seo.author.name,
              ...(seo.author.slug
                ? { url: `${baseURL}/author/${seo.author.slug}/` }
                : {}),
            },
          ],
        }
      : {}),
    ...(seo.sections[0] ? { category: seo.sections[0] } : {}),
    ...(seo.robots ? { robots: seo.robots } : {}),
    openGraph: {
      type: 'article',
      url: `${baseURL}${path}`,
      title: seo.shareTitle,
      description: seo.shareDescription,
      ...(seo.image ? { image: seo.image } : {}),
      ...(seo.datePublished ? { publishedTime: seo.datePublished } : {}),
      ...(seo.dateModified ? { modifiedTime: seo.dateModified } : {}),
      ...(seo.author.slug
        ? { authors: [`${baseURL}/author/${seo.author.slug}/`] }
        : {}),
      ...(seo.sections[0] ? { section: seo.sections[0] } : {}),
      ...(seo.tags.length ? { tags: seo.tags } : {}),
    },
  }
}
