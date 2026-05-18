import Link from 'next/link'
import { PageWrapper } from '@/components/page-wrapper'
import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { BackButton } from '@/components/back-button'
import { PostActions } from '@/components/post-actions'
import EditLink from '@/components/edit-link'
import { LightboxWrapper } from '@/components/lightbox-wrapper'
import { ParseBlocks } from '@/utils/parse-blocks'
import { generatePageMetadata, type PageMetadata } from '@/utils/page-helpers'
import { replaceProductionUrl } from '@/utils/replace-production-url'
import { baseURL, defaultDescription } from '@/app/metadata'
import { buildPageSchema } from '@/utils/structured-data'
import { notFound } from 'next/navigation'
import blogData from '@/../_data/_blog.json'

interface PageProps {
  params: Promise<{
    year: string
    month: string
    slug: string
  }>
}

async function fetchPost(slug: string, year: string, month: string) {
  const wpJson = process.env.WORDPRESS_API_URL
  if (!wpJson) return null

  const linkUrl = `${wpJson}/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=link`
  const linkRes = await fetch(linkUrl, { next: { revalidate: 300 } })
  if (!linkRes.ok) return null

  const posts = await linkRes.json()
  if (!Array.isArray(posts) || !posts.length) return null

  const match = posts.find((p: { link?: string }) => {
    if (!p.link) return false
    const m = new URL(p.link).pathname.match(/^\/(\d{4})\/(\d{2})\//)
    return m && m[1] === year && m[2] === month
  })
  if (!match?.link) return null

  const uri = new URL(match.link).pathname

  const gallopUrl = `${wpJson}/gallop/v1/post/`
  const res = await fetch(gallopUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uri }),
    next: { revalidate: 300 },
  })

  if (!res.ok) return null

  const data = await res.json()
  if (!data.post) return null

  return data
}

export function generateStaticParams() {
  return (blogData as { url: string }[])
    .map((entry) => {
      const match = entry.url.match(/^\/(\d{4})\/(\d{2})\/([^/]+)\/?$/)
      if (!match) return null
      return { year: match[1], month: match[2], slug: match[3] }
    })
    .filter((p): p is { year: string; month: string; slug: string } => p !== null)
}

export async function generateMetadata({ params }: PageProps) {
  const { year, month, slug } = await params
  const data = await fetchPost(slug, year, month)

  if (!data) return { title: 'Post Not Found' }

  const { post, seo } = data
  const path = `${year}/${month}/${slug}`
  const metaEntry = (
    blogData as {
      slug: string
      metadata?: {
        featuredImage?: string
        featuredImageWidth?: number
        featuredImageHeight?: number
      }
    }[]
  ).find((entry) => entry.slug === slug)
  const featuredImage =
    seo?.opengraphImage?.mediaItemUrl || metaEntry?.metadata?.featuredImage
  const featuredImageWidth = metaEntry?.metadata?.featuredImageWidth
  const featuredImageHeight = metaEntry?.metadata?.featuredImageHeight

  const metaExcerpt = (post.postExcerpt as string | undefined)
    ?.replace(/<[^>]*>/g, '')
    .trim()

  const metadata: PageMetadata = {
    title: seo?.title || post.postTitle,
    description: seo?.metaDesc || metaExcerpt || defaultDescription,
    slug: path,
    alternates: { canonical: `/${path}/` },
    openGraph: {
      type: 'article' as const,
      title: seo?.opengraphTitle || seo?.title || post.postTitle,
      description: seo?.opengraphDescription,
      ...(seo?.opengraphUrl ? { url: replaceProductionUrl(seo.opengraphUrl) } : {}),
      ...(seo?.opengraphSiteName ? { siteName: seo.opengraphSiteName } : {}),
      ...(featuredImage
        ? {
            image: {
              url: featuredImage,
              alt: post.postTitle,
              ...(featuredImageWidth ? { width: featuredImageWidth } : {}),
              ...(featuredImageHeight ? { height: featuredImageHeight } : {}),
            },
          }
        : {}),
    },
  }

  return generatePageMetadata(metadata, [year, month, slug])
}

export default async function PostPage({ params }: PageProps) {
  const { year, month, slug } = await params
  const data = await fetchPost(slug, year, month)

  if (!data) notFound()

  const { post, seo } = data
  const path = `${year}/${month}/${slug}`
  const blogEntry = (
    blogData as {
      id: number
      slug: string
      metadata?: { categories?: string[]; categorySlugs?: string[] }
    }[]
  ).find((entry) => entry.slug === slug)
  const postId = blogEntry?.id ?? (post.ID as number | undefined) ?? post.id
  const categoryNames = blogEntry?.metadata?.categories ?? []
  const categorySlugs = blogEntry?.metadata?.categorySlugs ?? []
  const categories = categorySlugs
    .map((s, i) => ({ slug: s, name: categoryNames[i] ?? s }))
    .filter((c) => c.slug)
  const postUrl = `${baseURL}/${path}/`
  const excerpt = (post.postExcerpt as string | undefined)
    ?.replace(/<[^>]*>/g, '')
    .trim()
  const description =
    excerpt || seo?.opengraphDescription || seo?.metaDesc || undefined

  const blogPosting = {
    '@type': 'BlogPosting',
    '@id': `${postUrl}#blogposting`,
    isPartOf: { '@id': postUrl },
    mainEntityOfPage: { '@id': postUrl },
    headline: post.postTitle,
    name: post.postTitle,
    ...(description ? { description } : {}),
    url: postUrl,
    inLanguage: 'en-US',
    author: { '@id': `${baseURL}/#person` },
    publisher: { '@id': `${baseURL}/#person` },
    ...(seo?.opengraphImage?.mediaItemUrl
      ? { image: { '@id': `${baseURL}/#primaryimage` } }
      : {}),
    ...(categories.length
      ? {
          articleSection: categories.map((c) => c.name),
          keywords: categories.map((c) => c.name).join(', '),
        }
      : {}),
  }

  const metadata: PageMetadata = {
    title: seo?.title || post.postTitle,
    slug: path,
    structuredData: buildPageSchema({
      url: postUrl,
      title: post.postTitle,
      seo,
      post,
      breadcrumbs: [
        { name: 'Home', href: '/' },
        { name: post.postTitle, href: `/${path}/` },
      ],
      schemaList: [blogPosting],
    }),
  }

  return (
    <PageWrapper metadata={metadata}>
      <Section className="pt-7 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-3">
            <BackButton className="text-lg sm:text-xl md:text-2xl shrink-0" />
            <Heading as="h1" margin="mb-0" className="!mb-0">
              {post.postTitle}
            </Heading>
          </div>
          <PostActions
            {...(typeof postId === 'number' ? { postId } : {})}
            title={post.postTitle}
            url={`${baseURL}/${path}/`}
            slug={slug}
            className="mt-6 py-2 mb-6 border-y border-contrast/10 flex w-full"
          />
          <LightboxWrapper>
            <ParseBlocks content={post.postContent || ''} />
          </LightboxWrapper>
          <PostActions
            {...(typeof postId === 'number' ? { postId } : {})}
            title={post.postTitle}
            url={`${baseURL}/${path}/`}
            slug={slug}
            className="border-y border-contrast/10 py-2 flex w-full"
          />
          {categories.length > 0 && (
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Heading as="h4" className="sr-only">
                Categories
              </Heading>
              <Paragraph margin="mb-0">Filed Under:</Paragraph>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}/`}
                  className="group inline-block px-3 py-1 rounded-full border border-contrast/20 no-underline! hover:bg-accent hover:border-accent transition-colors [&_p]:text-contrast [&:hover_p]:text-accent-contrast"
                >
                  <Paragraph margin="mb-0">{cat.name}</Paragraph>
                </Link>
              ))}
            </div>
          )}
          {typeof postId === 'number' && (
            <EditLink
              meta={{
                databaseId: postId,
                slug,
                postType: 'post',
                wpUrl: (process.env.WORDPRESS_API_URL || '').replace(
                  /\/wp-json\/?$/,
                  ''
                ),
              }}
            />
          )}
        </div>
      </Section>
    </PageWrapper>
  )
}
