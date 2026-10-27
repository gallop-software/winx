import parse, {
  type HTMLReactParserOptions,
  domToReact,
  type DOMNode,
  type Element,
} from 'html-react-parser'
import { Heading } from '@/components/heading'
import { coreParagraph } from '@/components/paragraph'
import { coreQuote } from '@/components/quote'
import { Image, coreImage } from '@/components/image'
import { coreGallery } from '@/components/gallery'
import { coreList } from '@/components/list'
import { Button } from '@/components/button'
import { coreButtons } from '@/components/buttons'
import { coreCover } from '@/components/cover'
import { tagAnchor } from '@/components/link'
import { replaceProductionUrl } from '@/utils/replace-production-url'
import { Span } from '@/components/span'
import { coreEmbed, Embed } from '@/components/embed'
import { Caption } from '@/components/caption'
import { coreAudio } from '@/components/audio'
import { coreTable } from '@/components/table'
import { coreGroup } from '@/components/group'
import { coreSeparator } from '@/components/separator'
import { coreSpacer } from '@/components/spacer'
import { coreCode, tagPre, tagCode } from '@/components/code'
import {
  isTag,
  hasExactClass,
  getAttrib,
  getClassName,
  findDeep,
  isBlank,
} from '@/utils/parse-blocks-helpers'

const headingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

const imageFile = /\.(jpg|jpeg|png|gif|webp|svg)$/i

// The images of a paragraph that holds nothing but images linked to their own
// files, which is how the classic editor saved them. Anything else in the
// paragraph and it is not one of these.
function linkedImages(
  children: DOMNode[]
): { href: string; img: Element }[] | null {
  const found: { href: string; img: Element }[] = []
  for (const child of children) {
    if (!isTag(child)) {
      if (!isBlank([child])) return null
      continue
    }
    if (child.name === 'br') continue
    if (child.name !== 'a') return null
    const href = replaceProductionUrl(getAttrib(child, 'href'))
    if (!imageFile.test(href)) return null
    const inside = (child.children as DOMNode[]).filter(
      (node) => isTag(node) || !isBlank([node])
    )
    const img = inside[0]
    if (inside.length !== 1 || !img || !isTag(img) || img.name !== 'img') {
      return null
    }
    found.push({ href, img })
  }
  return found.length ? found : null
}

function compressContent(html: string): string {
  return html
    .replace(/(\r\n|\n|\r)/gm, '')
    .replace(/<iframe([^>]*)>.*?<\/iframe>/gi, '<iframe$1></iframe>')
}

export function ParseBlocks({ content }: { content: string }) {
  if (!content) return null

  content = compressContent(content)

  const options: HTMLReactParserOptions = {
    replace(domNode) {
      if (!isTag(domNode)) return undefined

      const className = getClassName(domNode)

      // --- wp-block-* class-based detection ---

      if (className?.includes('wp-block-embed')) {
        if (isBlank(domNode.children as DOMNode[])) return <></>
        return coreEmbed(domNode, options, className)
      }

      if (className?.includes('wp-block-image')) {
        return coreImage(domNode, className)
      }

      if (className?.includes('wp-block-quote')) {
        return coreQuote(domNode, options, className)
      }

      if (className?.includes('wp-block-gallery')) {
        return coreGallery(domNode, options, className)
      }

      if (className?.includes('wp-block-table')) {
        return coreTable(domNode, options, className)
      }

      if (hasExactClass(className, 'wp-block-group')) {
        return coreGroup(domNode, options, className)
      }

      if (className?.includes('wp-block-buttons')) {
        return coreButtons(domNode, options)
      }

      if (className?.includes('wp-block-button__link')) {
        const href = replaceProductionUrl(getAttrib(domNode, 'href'))
        return (
          <Button href={href}>
            {domToReact(domNode.children as DOMNode[], options)}
          </Button>
        )
      }

      if (className?.includes('wp-block-button')) {
        return (
          <div className={className}>
            {domToReact(domNode.children as DOMNode[], options)}
          </div>
        )
      }

      if (className?.includes('wp-block-separator') || domNode.name === 'hr') {
        return coreSeparator()
      }

      if (className?.includes('wp-block-spacer')) {
        return coreSpacer(domNode)
      }

      if (className?.includes('wp-block-code')) {
        return coreCode(domNode, options, className)
      }

      if (className?.includes('wp-block-cover')) {
        return coreCover(domNode, options, className)
      }

      if (className?.includes('wp-block-audio')) {
        return coreAudio(domNode, className)
      }

      if (className?.includes('wp-block-heading')) {
        if (headingTags.has(domNode.name)) {
          const tag = domNode.name as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
          const id = getAttrib(domNode, 'id')
          return (
            <Heading
              as={tag}
              {...(id ? { id } : {})}
            >
              {domToReact(domNode.children as DOMNode[], options)}
            </Heading>
          )
        }
      }

      // --- Tag-based fallbacks ---

      if (domNode.name === 'p') {
        if (isBlank(domNode.children as DOMNode[])) return <></>
        // Shown as figures in place of the paragraph, so the lightbox opens
        // them as it does an image block.
        const images = linkedImages(domNode.children as DOMNode[])
        if (images) {
          return (
            <>
              {images.map(({ href, img }, index) => {
                const w = getAttrib(img, 'width')
                const h = getAttrib(img, 'height')
                const ss = getAttrib(img, 'srcset') || getAttrib(img, 'srcSet')
                const sz = getAttrib(img, 'sizes')
                return (
                  <div
                    key={index}
                    className="mb-8"
                  >
                    <Image
                      src={getAttrib(img, 'src')}
                      alt={getAttrib(img, 'alt')}
                      href={href}
                      {...(w ? { width: parseInt(w, 10) } : {})}
                      {...(h ? { height: parseInt(h, 10) } : {})}
                      {...(ss ? { srcSet: ss } : {})}
                      {...(sz ? { sizes: sz } : {})}
                      className={getClassName(img)}
                      rounded="rounded-none"
                    />
                  </div>
                )
              })}
            </>
          )
        }
        return coreParagraph(domNode, options, className)
      }

      if (headingTags.has(domNode.name)) {
        const tag = domNode.name as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
        const id = getAttrib(domNode, 'id')
        return (
          <Heading
            as={tag}
            {...(id ? { id } : {})}
          >
            {domToReact(domNode.children as DOMNode[], options)}
          </Heading>
        )
      }

      if (domNode.name === 'figure') {
        const children = domNode.children as DOMNode[]

        if (findDeep(children, 'img')) {
          return coreImage(domNode, className)
        }

        if (findDeep(children, 'iframe')) {
          return (
            <Embed className={className}>{domToReact(children, options)}</Embed>
          )
        }

        if (findDeep(children, 'audio')) {
          return coreAudio(domNode, className)
        }

        return undefined
      }

      if (domNode.name === 'blockquote') {
        return coreQuote(domNode, options, className)
      }

      if (domNode.name === 'ul' || domNode.name === 'ol') {
        return coreList(domNode, options, className, domNode.name)
      }

      if (domNode.name === 'a') {
        return tagAnchor(domNode, options, className)
      }

      if (domNode.name === 'button') {
        return (
          <Button>{domToReact(domNode.children as DOMNode[], options)}</Button>
        )
      }

      if (domNode.name === 'span') {
        return (
          <Span className={className}>
            {domToReact(domNode.children as DOMNode[], options)}
          </Span>
        )
      }

      if (domNode.name === 'img') {
        const w = getAttrib(domNode, 'width')
        const h = getAttrib(domNode, 'height')
        const ss = getAttrib(domNode, 'srcset') || getAttrib(domNode, 'srcSet')
        const sz = getAttrib(domNode, 'sizes')
        return (
          <Image
            src={getAttrib(domNode, 'src')}
            alt={getAttrib(domNode, 'alt')}
            {...(w ? { width: parseInt(w, 10) } : {})}
            {...(h ? { height: parseInt(h, 10) } : {})}
            {...(ss ? { srcSet: ss } : {})}
            {...(sz ? { sizes: sz } : {})}
            className={className}
            rounded="rounded-none"
          />
        )
      }

      if (domNode.name === 'figcaption') {
        return (
          <Caption className={className}>
            {domToReact(domNode.children as DOMNode[], options)}
          </Caption>
        )
      }

      if (domNode.name === 'video') {
        return (
          <video
            src={getAttrib(domNode, 'src')}
            controls
            playsInline
            className={`w-full rounded-lg ${className}`}
          >
            <track kind="captions" />
          </video>
        )
      }

      if (domNode.name === 'pre') {
        return tagPre(domNode, className)
      }

      if (domNode.name === 'code') {
        return tagCode(domNode, className)
      }

      if (domNode.name === 'table') {
        return (
          <div className="overflow-x-auto my-6">
            <table className={`w-full border-collapse ${className}`}>
              {domToReact(domNode.children as DOMNode[], options)}
            </table>
          </div>
        )
      }

      if (domNode.name === 'th') {
        return (
          <th
            className={`border border-body-dark px-4 py-2 text-left font-semibold bg-body-light ${className}`}
          >
            {domToReact(domNode.children as DOMNode[], options)}
          </th>
        )
      }

      if (domNode.name === 'td') {
        return (
          <td className={`border border-body-dark px-4 py-2 ${className}`}>
            {domToReact(domNode.children as DOMNode[], options)}
          </td>
        )
      }

      return undefined
    },
  }

  return <>{parse(content, options)}</>
}
