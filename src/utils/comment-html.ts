import 'server-only'
import { htmlToDOM } from 'html-react-parser'
import type { CommentNode, CommentTag } from '@/utils/comment-types'

// Turns the HTML of a comment into a tree of the few elements a comment may
// contain. Nothing is let through by default: an element is only in the
// result because it is built here, and no attribute is ever copied across.
//
// WordPress filters what a visitor writes before it stores it, but a comment
// written in wp-admin is filtered less, and the site should not have to trust
// either.

type Node = {
  type: string
  data?: string
  name?: string
  attribs?: Record<string, string>
  children?: Node[]
}

const ALLOWED: ReadonlySet<string> = new Set<CommentTag>([
  'p',
  'br',
  'a',
  'em',
  'i',
  'strong',
  'b',
  'blockquote',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'del',
  's',
  'cite',
  'q',
  'abbr',
])

// Old names WordPress still allows in comments.
const RENAMED: Record<string, CommentTag> = { strike: 's', acronym: 'abbr' }

// Elements that hold other elements, not text. White space between their
// children is how the HTML was laid out, and is not part of the comment.
const CONTAINERS: ReadonlySet<string> = new Set(['ul', 'ol', 'blockquote'])

// Removed together with what is inside them. Any other element that is not
// allowed is removed and what is inside it kept.
const DROPPED: ReadonlySet<string> = new Set([
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'img',
  'picture',
  'source',
  'track',
  'video',
  'audio',
  'canvas',
  'svg',
  'math',
  'form',
  'input',
  'button',
  'select',
  'option',
  'optgroup',
  'textarea',
  'label',
  'fieldset',
  'template',
  'noscript',
  'noembed',
  'noframes',
  'link',
  'meta',
  'base',
  'head',
  'title',
  'xmp',
  'plaintext',
  'map',
  'area',
  'dialog',
  'slot',
  'portal',
])

const SAFE_PROTOCOLS: ReadonlySet<string> = new Set([
  'http:',
  'https:',
  'mailto:',
])

const MAX_DEPTH = 12
const MAX_NODES = 1500
const MAX_TEXT = 20000
const MAX_HREF = 2000

// The address as a browser would read it, or undefined if it is not one a
// comment may link to. What comes back is the URL parser's own spelling of
// the address, never the text that was sent.
export function safeHref(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined

  // A browser drops tabs and line breaks from anywhere in an address, and
  // control characters and spaces from either end, before it reads the
  // scheme. "java\tscript:" is "javascript:" to a browser.
  const cleaned = raw
    .replace(/[\t\n\r]/g, '')
    .replace(/^[\u0000- ]+|[\u0000- ]+$/g, '')
  if (!cleaned || cleaned.length > MAX_HREF) return undefined

  let url: URL
  try {
    url = new URL(cleaned)
  } catch {
    // Relative, or not an address.
    return undefined
  }

  if (!SAFE_PROTOCOLS.has(url.protocol)) return undefined
  if (url.protocol !== 'mailto:') {
    if (!url.hostname || url.username || url.password) return undefined
  }
  return url.href
}

function textOf(node: Node): string {
  if (node.type === 'text') return node.data ?? ''
  if (node.type !== 'tag') return ''
  if (DROPPED.has((node.name ?? '').toLowerCase())) return ''
  return (node.children ?? []).map(textOf).join('')
}

function push(out: CommentNode[], node: CommentNode) {
  const last = out[out.length - 1]
  if (typeof node === 'string' && typeof last === 'string') {
    out[out.length - 1] = last + node
  } else {
    out.push(node)
  }
}

export function sanitizeCommentHtml(html: unknown): CommentNode[] {
  if (typeof html !== 'string' || !html) return []

  let nodesLeft = MAX_NODES
  let textLeft = MAX_TEXT

  const addText = (out: CommentNode[], value: string) => {
    if (!value || textLeft <= 0) return
    const text = value.slice(0, textLeft)
    textLeft -= text.length
    push(out, text)
  }

  const walk = (
    nodes: Node[],
    depth: number,
    container: boolean
  ): CommentNode[] => {
    const out: CommentNode[] = []

    for (const node of nodes) {
      if (nodesLeft <= 0) break

      if (node.type === 'text') {
        const text = node.data ?? ''
        if (!container || text.trim() !== '') addText(out, text)
        continue
      }

      // Only 'tag' goes any further. The parser gives script and style
      // types of their own, and comments, CDATA and directives theirs: all
      // of them stop here.
      if (node.type !== 'tag') continue

      const name = (node.name ?? '').toLowerCase()
      const tag = RENAMED[name] ?? name
      if (DROPPED.has(tag) || tag.includes(':')) continue

      if (depth >= MAX_DEPTH) {
        addText(out, textOf(node))
        continue
      }

      const children =
        tag === 'br'
          ? []
          : walk(node.children ?? [], depth + 1, CONTAINERS.has(tag))

      if (!ALLOWED.has(tag)) {
        for (const child of children) push(out, child)
        continue
      }

      nodesLeft -= 1

      if (tag === 'a') {
        const href = safeHref(node.attribs?.href)
        if (href) out.push({ tag: 'a', href, children })
        else for (const child of children) push(out, child)
        continue
      }

      out.push({ tag: tag as Exclude<CommentTag, 'a'>, children })
    }

    return out
  }

  const dom = htmlToDOM(html, {
    lowerCaseTags: true,
    lowerCaseAttributeNames: true,
    decodeEntities: true,
  }) as unknown as Node[]

  return walk(dom, 0, true)
}
