import Link from 'next/link'
import { PageWrapper } from '@/components/page-wrapper'
import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Image } from '@/components/image'
import { BackButton } from '@/components/back-button'
import { PostActions } from '@/components/post-actions'
import EditLink from '@/components/edit-link'
import { Comments } from '@/components/comments'
import { LightboxWrapper } from '@/components/lightbox-wrapper'
import { ParseBlocks } from '@/utils/parse-blocks'
import { baseURL } from '@/app/metadata'
import {
  articleSchemaId,
  buildArticleSchema,
  buildPageSchema,
} from '@/utils/structured-data'
import { resolvePostSeo } from '@/utils/post-seo'
import { DateTime } from 'luxon'
import type { PostData } from '@/utils/post-cache'
import type { BlogPost } from '@/utils/content-index'
import type { LoadedPost } from '@/utils/post-page'
import { htmlToText } from '@/utils/html-text'
import { renderPostTitle } from '@/utils/post-title'

interface PostProps {
  loaded: LoadedPost
  year: string
  month: string
  slug: string
}

type FeaturedImage = {
  src: string
  alt: string
  width?: number
  height?: number
  srcSet?: string
}

const MIN_FEATURED_WIDTH = 100

// An image file's name without its extension or the size WordPress adds to a
// resized copy: Macbeth-300x167.jpg and Macbeth.jpg are both "macbeth".
function imageName(url: string) {
  const file = url.split(/[?#]/)[0]?.split('/').pop() ?? ''
  return file
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/-\d+x\d+$/, '')
    .toLowerCase()
}

// The post's featured image, shown whole above the text. Undefined when the
// post has none worth showing, or when its text already opens with the same
// image, which would show it twice in a row.
function getFeaturedImage(
  post: PostData['post'],
  fallback: BlogPost | null
): FeaturedImage | undefined {
  const featured = post.featuredImage
  const src: string =
    featured?.sourceUrl || fallback?.metadata.featuredImage || ''
  if (!src) return undefined

  const firstInText = String(post.postContent || '').match(
    /<img[^>]+src=["']([^"']+)["']/i
  )?.[1]
  if (firstInText && imageName(firstInText) === imageName(src)) {
    return undefined
  }

  const width = Number(featured?.width) || fallback?.metadata.featuredImageWidth
  const height =
    Number(featured?.height) || fallback?.metadata.featuredImageHeight

  // A few old posts have a spacer a few pixels wide as their featured image.
  if (width && width < MIN_FEATURED_WIDTH) return undefined

  // The smaller copies WordPress made, for smaller screens. A copy cropped
  // to another shape, such as the thumbnail, is left out.
  const copies = new Map<number, string>()
  if (width && height && Array.isArray(featured?.sizes)) {
    for (const size of featured.sizes) {
      const w = Number(size?.width)
      const h = Number(size?.height)
      if (!size?.sourceUrl || !w || !h || w >= width) continue
      if (Math.abs(w / h - width / height) > 0.02) continue
      copies.set(w, size.sourceUrl)
    }
  }
  const srcSet = copies.size
    ? [...copies, [width, src] as const]
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([w, url]) => `${url} ${w}w`)
        .join(', ')
    : undefined

  return {
    src,
    alt: featured?.altText || htmlToText(String(post.postTitle ?? '')),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(srcSet ? { srcSet } : {}),
  }
}

// A post, as WordPress published it, with its comments.
export default function Post({ loaded, year, month, slug }: PostProps) {
  const { data, entry: blogEntry } = loaded
  const { post } = data
  const path = `${year}/${month}/${slug}`
  const postId = blogEntry?.id ?? (post.ID as number | undefined) ?? post.id
  const categoryNames = blogEntry?.metadata?.categories ?? []
  const categorySlugs = blogEntry?.metadata?.categorySlugs ?? []
  const categories = categorySlugs
    .map((s, i) => ({ slug: s, name: categoryNames[i] ?? s }))
    .filter((c) => c.slug)
  const tagNames = blogEntry?.metadata?.tags ?? []
  const tags = (blogEntry?.metadata?.tagSlugs ?? [])
    .map((s, i) => ({ slug: s, name: tagNames[i] ?? s }))
    .filter((t) => t.slug)
  const featuredImage = getFeaturedImage(post, blogEntry)
  // The index knows the count once the post's comments have been read or
  // counted; until then the post's own copy serves.
  const commentCount =
    blogEntry?.metadata.commentCount ?? (Number(post.commentCount) || 0)
  const commentsOpen = post.commentStatus === 'open'
  // Closed with none: there is no comments section to go to.
  const showCommentCount =
    typeof postId === 'number' && (commentsOpen || commentCount > 0)

  const seo = resolvePostSeo(data, blogEntry, `/${path}/`)
  // The title as WordPress wrote it, for the heading, and as words alone for
  // sharing.
  const postTitle = String(post.postTitle ?? '')
  const titleText = htmlToText(postTitle)
  const postUrl = `${baseURL}/${path}/`
  // The day it was published, as the author's clock had it.
  const published = DateTime.fromSQL(String(post.postDate ?? ''))
  const firstCategory = categories[0]

  const structuredData = buildPageSchema({
    url: postUrl,
    title: seo.headline,
    description: seo.description,
    ...(seo.image ? { image: { ...seo.image, caption: seo.image.alt } } : {}),
    ...(seo.datePublished ? { datePublished: seo.datePublished } : {}),
    ...(seo.dateModified ? { dateModified: seo.dateModified } : {}),
    mainEntity: articleSchemaId(postUrl),
    breadcrumbs: [
      { name: 'Home', href: '/' },
      ...(firstCategory
        ? [
            {
              name: firstCategory.name,
              href: `/category/${firstCategory.slug}/`,
            },
          ]
        : []),
      { name: seo.headline, href: `/${path}/` },
    ],
    schemaList: buildArticleSchema({
      url: postUrl,
      headline: seo.headline,
      description: seo.description,
      hasImage: Boolean(seo.image),
      ...(seo.datePublished ? { datePublished: seo.datePublished } : {}),
      ...(seo.dateModified ? { dateModified: seo.dateModified } : {}),
      author: seo.author,
      sections: seo.sections,
      tags: seo.tags,
      wordCount: seo.wordCount,
      commentCount,
    }),
  })

  return (
    <PageWrapper metadata={{ title: seo.title, structuredData }}>
      <Section className="pt-7 pb-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-3">
            <BackButton className="text-lg sm:text-xl md:text-2xl shrink-0" />
            <Heading
              as="h1"
              margin="mb-0"
              className="!mb-0"
            >
              {renderPostTitle(postTitle)}
            </Heading>
          </div>
          <PostActions
            {...(typeof postId === 'number' ? { postId } : {})}
            title={titleText}
            url={`${baseURL}/${path}/`}
            slug={slug}
            {...(showCommentCount ? { commentCount } : {})}
            className="mt-6 py-2 mb-6 border-y border-contrast/10 flex w-full"
          />
          <LightboxWrapper>
            {featuredImage && (
              <figure className="mb-7">
                <Image
                  src={featuredImage.src}
                  alt={featuredImage.alt}
                  width={featuredImage.width}
                  height={featuredImage.height}
                  {...(featuredImage.srcSet
                    ? {
                        srcSet: featuredImage.srcSet,
                        sizes: '(min-width: 1024px) 896px, 100vw',
                      }
                    : {})}
                  size="full"
                  rounded="rounded-sm"
                  lazy={false}
                  mediaLink
                />
              </figure>
            )}
            {(published.isValid || seo.author.name) && (
              <Paragraph
                margin="mb-4"
                fontSize="text-[0.9rem]"
                color="text-contrast/60"
                className="italic"
              >
                {published.isValid && (
                  <time dateTime={seo.datePublished ?? published.toISODate()}>
                    {published.toFormat('LLLL d, yyyy')}
                  </time>
                )}
                {published.isValid && seo.author.name && ' · '}
                {seo.author.name &&
                  (seo.author.slug ? (
                    <Link
                      href={`/author/${seo.author.slug}/`}
                      rel="author"
                      className="text-inherit! no-underline! hover:underline!"
                    >
                      {seo.author.name}
                    </Link>
                  ) : (
                    seo.author.name
                  ))}
              </Paragraph>
            )}
            <ParseBlocks content={post.postContent || ''} />
          </LightboxWrapper>
          <PostActions
            {...(typeof postId === 'number' ? { postId } : {})}
            title={titleText}
            url={`${baseURL}/${path}/`}
            slug={slug}
            {...(showCommentCount ? { commentCount } : {})}
            className="border-y border-contrast/10 py-2 flex w-full"
          />
          {categories.length > 0 && (
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Heading
                as="h4"
                className="sr-only"
              >
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
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Heading
                as="h4"
                className="sr-only"
              >
                Tags
              </Heading>
              <Paragraph margin="mb-0">Tags:</Paragraph>
              {tags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/tag/${tag.slug}/`}
                  rel="tag"
                  className="group inline-block px-3 py-1 rounded-full border border-contrast/20 no-underline! hover:bg-accent hover:border-accent transition-colors [&_p]:text-contrast [&:hover_p]:text-accent-contrast"
                >
                  <Paragraph margin="mb-0">{tag.name}</Paragraph>
                </Link>
              ))}
            </div>
          )}
          {typeof postId === 'number' && (
            <Comments
              postId={postId}
              initialCount={commentCount}
              initialOpen={commentsOpen}
            />
          )}
          {typeof postId === 'number' && (
            <EditLink
              meta={{
                databaseId: postId,
                slug,
                postType: 'post',
                wpUrl: process.env.NEXT_PUBLIC_WORDPRESS_URL || '',
              }}
            />
          )}
        </div>
      </Section>
    </PageWrapper>
  )
}
