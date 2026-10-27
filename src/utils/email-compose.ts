import 'server-only'
import { baseURL } from '@/app/metadata'
import { getPostByUrl } from '@/utils/content-index'
import { renderPostForEmail } from '@/utils/email-post-content'
import { renderEmail, renderEmailText, type EmailPost } from '@/utils/email-template'
import { decodeEntities, htmlToText } from '@/utils/html-text'
import { getPost, type PostData } from '@/utils/post-cache'
import { parsePostUrl } from '@/utils/post-url'

// A post made into the email it is sent as: the same post the page shows,
// from the same cache, in the template of src/utils/email-template.ts.

export const SUBJECT_MAX = 200
export const PREHEADER_MAX = 200

export type ComposedEmail = {
  postId: number
  // The post's path on the site, as the content index stores it.
  postUrl: string
  postTitle: string
  subject: string
  preheader: string
  // With the placeholders of email-template.ts still in it: the links are
  // filled in for each recipient when it is sent.
  html: string
  text: string
}

// Twice the width it is shown at, for sharp screens, and no more: a mailing
// with a 3000 pixel photograph in it is slow to open and may be cut short.
const FEATURED_WIDTH = 1100

function imageName(url: string) {
  const file = url.split(/[?#]/)[0]?.split('/').pop() ?? ''
  return file
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/-\d+x\d+$/, '')
    .toLowerCase()
}

// The post's featured image, as the post page chooses it: left out when the
// text opens with the same picture, or when it is only a spacer.
function featuredImage(
  post: PostData['post'],
  fallback: string | undefined
): EmailPost['featuredImage'] {
  const featured = post.featuredImage
  const src: string = featured?.sourceUrl || fallback || ''
  if (!src) return undefined

  const firstInText = String(post.postContent || '').match(
    /<img[^>]+src=["']([^"']+)["']/i
  )?.[1]
  if (firstInText && imageName(firstInText) === imageName(src)) return undefined

  const width = Number(featured?.width) || 0
  const height = Number(featured?.height) || 0
  if (width && width < 100) return undefined

  // The smallest copy WordPress made that is still wide enough, of the same
  // shape as the original.
  let chosen = { src, width }
  if (width > FEATURED_WIDTH && height && Array.isArray(featured?.sizes)) {
    for (const size of featured.sizes) {
      const w = Number(size?.width)
      const h = Number(size?.height)
      if (!size?.sourceUrl || !w || !h || w < FEATURED_WIDTH) continue
      if (Math.abs(w / h - width / height) > 0.02) continue
      if (w < chosen.width) chosen = { src: size.sourceUrl, width: w }
    }
  }

  return {
    src: chosen.src,
    alt: featured?.altText || decodeEntities(String(post.postTitle || '')),
    ...(chosen.width ? { width: chosen.width } : {}),
  }
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

// The email for the post at `path` (/2024/05/a-post), or null if there is no
// such post. The subject and the line after it default to the post's title
// and the start of its text.
export async function composePostEmail(
  path: string,
  overrides: { subject?: unknown; preheader?: unknown } = {}
): Promise<ComposedEmail | null> {
  const parts = parsePostUrl(path)
  if (!parts) return null

  const data = await getPost(parts.slug, parts.year, parts.month)
  if (!data) return null

  const { post } = data
  const postUrl = `/${parts.year}/${parts.month}/${parts.slug}`
  const indexed = await getPostByUrl(postUrl)
  const postId = indexed?.id ?? Number(post.ID ?? post.id)
  if (!Number.isInteger(postId) || postId <= 0) return null

  const url = `${baseURL}${postUrl}/`
  const title = decodeEntities(String(post.postTitle || '')).trim()
  const body = renderPostForEmail(String(post.postContent || ''), { postUrl: url })

  const email: EmailPost = {
    title,
    url,
    bodyHtml: body.html,
  }
  const featured = featuredImage(post, indexed?.metadata.featuredImage)
  if (featured) email.featuredImage = featured

  const excerpt = htmlToText(String(post.postExcerpt || ''))
  const subject = clean(overrides.subject, SUBJECT_MAX) || title
  const preheader =
    clean(overrides.preheader, PREHEADER_MAX) ||
    (excerpt || body.text.replace(/\s+/g, ' ')).slice(0, 140).trim()

  return {
    postId,
    postUrl,
    postTitle: title,
    subject,
    preheader,
    html: renderEmail(email, preheader),
    text: renderEmailText(email, body.text),
  }
}
