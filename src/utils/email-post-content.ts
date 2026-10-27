import { htmlToDOM, type DOMNode, type Element } from 'html-react-parser'
import {
  CONTENT_WIDTH,
  absoluteUrl,
  button,
  escapeHtml,
  style,
  videoBlock,
} from '@/utils/email-template'
import {
  findDeep,
  getAttrib,
  getClassName,
  getTextContent,
  isBlank,
  isTag,
} from '@/utils/parse-blocks-helpers'
import { replaceProductionUrl } from '@/utils/replace-production-url'

// A post's content written for email. It reads the same HTML from WordPress that
// ParseBlocks turns into the page, and keeps what a mail program can show:
// text, links, images, lists, quotes and tables, each carrying its own style.
// What it cannot show (a video, an audio player, an embed) becomes a link to
// the post on the site.

type Context = {
  // The post on the site, where anything that cannot be shown is linked to.
  postUrl: string
}

// Kept as they are, with nothing but their children.
const INLINE = new Set([
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'ins',
  'sub',
  'sup',
  'small',
  'mark',
  'abbr',
  'br',
])

// Never shown, and neither is anything inside them.
const DROPPED = new Set([
  'script',
  'style',
  'noscript',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'svg',
  'object',
  'embed',
  'link',
  'meta',
])

// As in email-gallery.tsx: up to three a row, a gap of 1.5% between them.
const GALLERY_COLUMNS = 3
const GALLERY_GAP_PERCENT = 1.5

function linkOf(href: string, context: Context): string {
  if (!href) return context.postUrl
  // A link to another place in the post only works on the page.
  if (href.startsWith('#')) return `${context.postUrl}${href}`
  return absoluteUrl(replaceProductionUrl(href))
}

function children(node: Element, context: Context): string {
  return (node.children as DOMNode[]).map((child) => render(child, context)).join('')
}

function imageSource(node: Element): string {
  // An image waiting to be loaded as the page scrolls has its address in
  // data-src.
  const src = getAttrib(node, 'data-src') || getAttrib(node, 'src')
  return !src || src.startsWith('data:') ? '' : absoluteUrl(src)
}

// Full width of the column, as the template's .media-image.
// Never stretched: a picture smaller than the column keeps its own size,
// centred, and a larger one is shrunk to the column. Either shrinks to fit a
// phone. The width attribute is for the old Outlook, which sizes by it.
function image(node: Element, width = CONTENT_WIDTH): string {
  const src = imageSource(node)
  if (!src) return ''
  const own = Number(getAttrib(node, 'width'))
  const shown = own > 0 ? Math.min(own, width) : width
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(getAttrib(node, 'alt'))}" width="${shown}" style="${style.img}width:100%;max-width:${shown}px;margin:0 auto;" />`
}

// The classic editor joins words with non-breaking spaces, and a line that
// cannot be broken pushes the column wider than the header. In the email they
// are ordinary spaces.
function plainText(node: DOMNode): string {
  return ((node as unknown as { data: string }).data || '').replace(/\u00a0/g, ' ')
}

function caption(node: Element | undefined, context: Context): string {
  if (!node || isBlank(node.children as DOMNode[])) return ''
  return `<p style="${style.caption}">${children(node, context)}</p>`
}

// The template's .media-wrapper: the picture, linked, and its caption.
function mediaWrapper(picture: string, href: string, captionHtml = ''): string {
  return `<div style="${style.media}"><a href="${escapeHtml(href)}" style="display:block;">${picture}</a>${captionHtml}</div>`
}

// A video's still picture, for the two hosts that publish one at an address
// that can be worked out.
function youtubeId(src: string): string | null {
  return (
    src.match(
      /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|v\/)|youtu\.be\/)([\w-]{11})/
    )?.[1] ?? null
  )
}

// Something that only plays on a page: the template's video (a still picture
// with a Play Video bar) where there is a picture, and otherwise a button to
// the place it plays.
function media(src: string, label: string, context: Context): string {
  const id = youtubeId(src)
  if (id) {
    return videoBlock(
      `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      `https://www.youtube.com/watch?v=${id}`,
      'Watch the video'
    )
  }
  return `<div style="margin:30px 0;">${button(label, context.postUrl)}</div>`
}

function embed(node: Element, context: Context): string {
  const frame = findDeep([node], 'iframe')
  const src = frame ? getAttrib(frame, 'src') || getAttrib(frame, 'data-src') : ''
  // WordPress leaves the address as text when it could not embed it.
  const address = src || getTextContent(node).trim()
  const figcaption = findDeep(node.children as DOMNode[], 'figcaption')
  return media(address, 'Watch on the website', context) + caption(figcaption, context)
}

// The template's gallery: rows of up to three, each picture as wide as its
// shape asks so a row is one height, 1.5% apart (email-gallery.tsx).
function gallery(node: Element, context: Context): string {
  const images: Element[] = []
  const collect = (nodes: DOMNode[]) => {
    for (const child of nodes) {
      if (!isTag(child)) continue
      if (child.name === 'img') images.push(child)
      else collect(child.children as DOMNode[])
    }
  }
  collect(node.children as DOMNode[])
  const usable = images.filter((img) => imageSource(img))
  if (!usable.length) return ''

  const rows: string[] = []
  for (let i = 0; i < usable.length; i += GALLERY_COLUMNS) {
    const row = usable.slice(i, i + GALLERY_COLUMNS)
    const n = row.length
    const reducer = (100 - GALLERY_GAP_PERCENT * (n - 1)) / 100
    const half = GALLERY_GAP_PERCENT / 2
    // Width over height; a picture without its size counts as square.
    const ratios = row.map((img) => {
      const w = Number(getAttrib(img, 'width'))
      const h = Number(getAttrib(img, 'height'))
      return w > 0 && h > 0 ? w / h : 1
    })
    const total = ratios.reduce((sum, r) => sum + r, 0)

    const cells = row
      .map((img, index) => {
        const natural = ((reducer * ratios[index]!) / total) * 100
        const left = index > 0 ? half : 0
        const right = index < n - 1 ? half : 0
        const width = (natural + left + right).toFixed(4)
        return `<td align="center" valign="middle" style="width:${width}%;padding:0 ${right}% 1.5% ${left}%;"><a href="${escapeHtml(context.postUrl)}"><img src="${escapeHtml(imageSource(img))}" alt="${escapeHtml(getAttrib(img, 'alt'))}" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:0;" /></a></td>`
      })
      .join('')
    rows.push(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr>${cells}</tr></table>`
    )
  }

  const figcaption = findDeep(node.children as DOMNode[], 'figcaption')
  return `<div style="margin:0 0 30px 0;max-width:600px;">${rows.join('')}${caption(figcaption, context)}</div>`
}

function figure(node: Element, context: Context): string {
  const kids = node.children as DOMNode[]
  if (findDeep(kids, 'iframe')) return embed(node, context)
  if (findDeep(kids, 'video')) return media('', 'Watch on the website', context)
  if (findDeep(kids, 'audio')) return media('', 'Listen on the website', context)
  if (findDeep(kids, 'table')) return children(node, context)

  const img = findDeep(kids, 'img')
  if (!img) return children(node, context)

  const link = findDeep(kids, 'a')
  const picture = image(img)
  if (!picture) return ''

  // An image linked to its own file opens nothing useful in a mail program:
  // it goes to the post instead.
  const href = link ? getAttrib(link, 'href') : ''
  const target =
    href && !/\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i.test(href)
      ? linkOf(href, context)
      : context.postUrl

  return mediaWrapper(picture, target, caption(findDeep(kids, 'figcaption'), context))
}

function render(node: DOMNode, context: Context): string {
  if (node.type === 'text') {
    return escapeHtml(plainText(node))
  }
  if (!isTag(node)) return ''

  const name = node.name
  const className = getClassName(node)
  const kids = node.children as DOMNode[]

  if (DROPPED.has(name)) return ''
  if (INLINE.has(name)) {
    return name === 'br' ? '<br />' : `<${name}>${children(node, context)}</${name}>`
  }

  if (/\bwp-block-embed\b/.test(className)) return embed(node, context)
  if (/\bwp-block-gallery\b/.test(className)) return gallery(node, context)
  if (/\bwp-block-spacer\b/.test(className)) {
    return '<div style="height:24px;line-height:24px;font-size:1px;">&nbsp;</div>'
  }
  if (/\bwp-block-button__link\b/.test(className) && name === 'a') {
    return `<div style="margin:30px 0;">${button(getTextContent(node).trim(), linkOf(getAttrib(node, 'href'), context))}</div>`
  }

  switch (name) {
    case 'p': {
      if (isBlank(kids)) return ''
      const align = /\bhas-text-align-(center|right)\b/.exec(className)?.[1]
      return `<p style="${style.p}${align ? `text-align:${align};` : ''}">${children(node, context)}</p>`
    }
    case 'h1':
    case 'h2':
      return isBlank(kids) ? '' : `<h3 style="${style.subheading}">${children(node, context)}</h3>`
    case 'h3':
      return isBlank(kids) ? '' : `<h3 style="${style.h3}">${children(node, context)}</h3>`
    case 'h4':
    case 'h5':
    case 'h6':
      return isBlank(kids) ? '' : `<h4 style="${style.h4}">${children(node, context)}</h4>`
    case 'a': {
      const inside = children(node, context)
      if (!inside.trim()) return ''
      return `<a href="${escapeHtml(linkOf(getAttrib(node, 'href'), context))}" style="${style.a}">${inside}</a>`
    }
    case 'img': {
      // A picture on its own in the text: the template's .media-wrapper.
      const picture = image(node)
      return picture ? mediaWrapper(picture, context.postUrl) : ''
    }
    case 'figure':
      return figure(node, context)
    case 'figcaption':
      return caption(node, context)
    case 'iframe':
      return media(
        getAttrib(node, 'src') || getAttrib(node, 'data-src'),
        'Watch on the website',
        context
      )
    case 'video':
      return media('', 'Watch on the website', context)
    case 'audio':
      return media('', 'Listen on the website', context)
    case 'ul':
    case 'ol':
      return `<${name} style="${style.list}">${children(node, context)}</${name}>`
    case 'li':
      return `<li style="${style.li}">${children(node, context)}</li>`
    case 'blockquote':
      // The template's .email-quote: the paragraphs inside sit closer.
      return `<blockquote style="${style.quote}">${children(node, context).replace(
        /<p style="margin:20px 0;/g,
        '<p style="margin:0 0 8px 0;'
      )}</blockquote>`
    case 'cite':
      return `<cite style="${style.cite}">${children(node, context)}</cite>`
    case 'hr':
      return `<hr style="${style.hr}" />`
    case 'pre':
      return `<pre style="${style.pre}">${escapeHtml(getTextContent(node))}</pre>`
    case 'code':
      return `<code style="${style.code}">${children(node, context)}</code>`
    case 'table':
      return `<table cellpadding="0" cellspacing="0" border="0" style="${style.table}">${children(node, context)}</table>`
    case 'thead':
    case 'tbody':
    case 'tfoot':
    case 'tr':
      return `<${name}>${children(node, context)}</${name}>`
    case 'th':
    case 'td': {
      const span = ['colspan', 'rowspan']
        .map((attr) => {
          const value = Number(getAttrib(node, attr))
          return value > 1 ? ` ${attr}="${value}"` : ''
        })
        .join('')
      return `<${name}${span} style="${name === 'th' ? style.th : style.td}">${children(node, context)}</${name}>`
    }
    default:
      // A wrapper (div, section, span, a block's own container): only what
      // is inside it matters.
      return children(node, context)
  }
}

// --- Plain text ---

const BLOCKS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'figure',
  'figcaption',
  'pre',
  'tr',
  'div',
  'hr',
])

function text(node: DOMNode, context: Context): string {
  if (node.type === 'text') {
    return plainText(node).replace(/\s+/g, ' ')
  }
  if (!isTag(node)) return ''
  if (DROPPED.has(node.name)) return ''
  if (node.name === 'br') return '\n'
  if (node.name === 'img') return ''
  if (['iframe', 'video', 'audio'].includes(node.name)) {
    return `\n\n[On the website: ${context.postUrl}]\n\n`
  }

  const inside = (node.children as DOMNode[]).map((child) => text(child, context)).join('')

  if (node.name === 'a') {
    const href = getAttrib(node, 'href')
    const label = inside.trim()
    if (!label) return ''
    const target = linkOf(href, context)
    return !href || label === target ? label : `${label} (${target})`
  }
  if (node.name === 'li') return `\n- ${inside.trim()}`
  if (BLOCKS.has(node.name)) return `\n\n${inside.trim()}\n\n`
  return inside
}

function parse(content: string): DOMNode[] {
  // The same tidying ParseBlocks does: line breaks in the source are not
  // content, and what a host puts inside an iframe is not either.
  const compressed = content
    .replace(/(\r\n|\n|\r)/gm, '')
    .replace(/<iframe([^>]*)>.*?<\/iframe>/gi, '<iframe$1></iframe>')
  return htmlToDOM(compressed) as DOMNode[]
}

export function renderPostForEmail(
  content: string,
  context: Context
): { html: string; text: string } {
  if (!content) return { html: '', text: '' }
  const nodes = parse(content)

  return {
    html: nodes.map((node) => render(node, context)).join('\n'),
    text: nodes
      .map((node) => text(node, context))
      .join('')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  }
}
