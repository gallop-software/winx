import { clsx } from 'clsx'
import Link from 'next/link'
import { Paragraph } from '@/components/paragraph'
import { Caption } from '@/components/caption'
import type { ComponentProps } from 'react'
import { getStudioImage } from '@/utils/studio-helpers'
import {
  type DOMNode,
  Element,
  domToReact,
} from 'html-react-parser'
import {
  isTag,
  getAttrib,
  getTextContent,
} from '@/utils/parse-blocks-helpers'
import { tailwindGetAlignClasses } from '@/utils/tailwind-get-align-classes'

export interface ImageProps extends Omit<
  ComponentProps<'img'>,
  'alt' | 'title'
> {
  /** Image source URL */
  src: string
  /** Alt text for accessibility - optional, falls back to empty string */
  alt?: string
  /** Title attribute for hover tooltip - optional */
  title?: string
  /** Caption text that supports HTML elements - optional */
  caption?: string
  /** Whether to wrap the image in paragraph containers - default is true */
  wrap?: boolean
  /** Additional CSS classes */
  className?: string | undefined
  /** Image width - uses natural width if not provided */
  width?: number | undefined
  /** Image height - uses natural height if not provided */
  height?: number | undefined
  /** Link href - if provided and is an image file, enables media lightbox */
  href?: string
  /** Image size variant to use from metadata - 'small', 'medium', 'large', or 'full' */
  size?: 'small' | 'medium' | 'large' | 'full'
  /** Rounded corners class - overrides default rounded classes */
  rounded?: string
  /** Aspect ratio class - overrides default aspect ratio classes */
  aspect?: string
  /** Enable media link with full-sized image - default is false */
  mediaLink?: boolean
  /** Enable lazy loading - default is true */
  lazy?: boolean
  /** Explicit srcSet - overrides auto-generated studio srcSet */
  srcSet?: string
  /** Explicit sizes attribute - overrides default based on size prop */
  sizes?: string
}

export function Image({
  src,
  alt = '',
  title,
  caption,
  wrap = false,
  className = '',
  width,
  height,
  href,
  size,
  rounded,
  aspect,
  mediaLink = false,
  lazy = true,
  srcSet,
  sizes,
}: ImageProps) {
  const defaultRounded = 'rounded-lg'

  // Check if user explicitly provided width or height
  const hasExplicitWidth = width !== undefined
  const hasExplicitHeight = height !== undefined

  // Default to 'large' size for metadata lookup if no size specified
  const effectiveSize = size || 'large'

  // Get resolved image from metadata (URL + dimensions)
  const studioImage = getStudioImage(src, effectiveSize)

  // Resolve src and dimensions
  const resolvedSrc = studioImage?.url || src
  let resolvedWidth: number | 'auto' | undefined = width
  let resolvedHeight: number | 'auto' | undefined = height

  // Use metadata dimensions if not explicitly provided
  if (!hasExplicitWidth && !hasExplicitHeight && studioImage) {
    resolvedWidth = studioImage.width
    resolvedHeight = studioImage.height
  }

  // If user explicitly provided only width or height, set the other to 'auto'
  if (hasExplicitWidth && !hasExplicitHeight) {
    resolvedHeight = 'auto'
  } else if (hasExplicitHeight && !hasExplicitWidth) {
    resolvedWidth = 'auto'
  }

  // Determine media link href
  let mediaLinkHref: string | null = null
  let isMediaLink = false

  // If href is set and points to an image, enable media link behavior
  if (href && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(href)) {
    mediaLinkHref = href
    isMediaLink = true
  }
  // If href is not set but mediaLink is true, use full size image for lightbox
  else if (!href && mediaLink) {
    const fullImage = getStudioImage(src, 'full')
    mediaLinkHref = fullImage?.url || src
    isMediaLink = true
  }

  // Calculate aspect ratio style if aspect prop is not provided and we have dimensions
  const aspectRatioStyle =
    !aspect && resolvedWidth && resolvedHeight
      ? { aspectRatio: `${resolvedWidth} / ${resolvedHeight}` }
      : undefined

  const imgClasses = clsx(
    rounded || defaultRounded,
    aspect,
    !resolvedWidth && !resolvedHeight ? 'w-full h-auto' : 'max-w-full h-auto',
    className
  )

  const imgTag = (
    <img
      src={resolvedSrc}
      alt={alt}
      title={title}
      width={resolvedWidth}
      height={resolvedHeight}
      loading={lazy ? 'lazy' : 'eager'}
      style={aspectRatioStyle}
      className={imgClasses}
      {...(srcSet ? { srcSet } : {})}
      {...(sizes ? { sizes } : {})}
    />
  )

  let imageElement = imgTag

  if (isMediaLink && mediaLinkHref) {
    imageElement = (
      <figure
        className={clsx(
          'rounded-none',
          !resolvedWidth && !resolvedHeight ? 'w-full h-auto' : ''
        )}
      >
        <Link
          href={mediaLinkHref}
          prefetch={false}
          scroll={true}
          className="lightbox-item cursor-pointer"
        >
          {imgTag}
        </Link>
      </figure>
    )
  } else if (href) {
    // Check if href is external (starts with http:// or https://)
    const isExternal = href.startsWith('http://') || href.startsWith('https://')

    if (isExternal) {
      imageElement = (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer"
        >
          {imgTag}
        </a>
      )
    } else {
      imageElement = (
        <Link
          href={href}
          prefetch={false}
          scroll={true}
          className="cursor-pointer"
        >
          {imgTag}
        </Link>
      )
    }
  }

  // Handle caption case
  if (caption) {
    let figureElement = (
      <figure className="space-y-2">
        {imgTag}
        <Caption html={caption} />
      </figure>
    )

    if (isMediaLink && mediaLinkHref) {
      figureElement = (
        <figure
          className={clsx(
            'rounded-none',
            !resolvedWidth && !resolvedHeight ? 'w-full h-auto space-y-2' : '',
            className
          )}
        >
          <Link
            href={mediaLinkHref}
            prefetch={false}
            scroll={true}
            className="lightbox-item"
          >
            {imgTag}
          </Link>
          <figcaption
            className="text-xs text-caption text-left font-normal italic mt-2"
            dangerouslySetInnerHTML={{ __html: caption }}
          />
        </figure>
      )
    }

    // Return with or without paragraph wrapper based on wrap prop
    return wrap ? <Paragraph>{figureElement}</Paragraph> : figureElement
  }

  // No caption case - return with or without paragraph wrapper based on wrap prop
  return wrap ? <Paragraph>{imageElement}</Paragraph> : imageElement
}

export function coreImage(domNode: Element, className: string) {
  let imgSrc = ''
  let imgAlt = ''
  let imgWidth: number | undefined
  let imgHeight: number | undefined
  let imgSrcSet: string | undefined
  let imgSizes: string | undefined
  let href = ''
  let caption: React.ReactNode = null

  const traverse = (nodes: DOMNode[]) => {
    for (const node of nodes) {
      if (!isTag(node)) continue

      if (node.name === 'img') {
        imgSrc = getAttrib(node, 'src')
        imgAlt = getAttrib(node, 'alt')
        const w = getAttrib(node, 'width')
        const h = getAttrib(node, 'height')
        if (w) imgWidth = parseInt(w, 10)
        if (h) imgHeight = parseInt(h, 10)
        const ss = getAttrib(node, 'srcset') || getAttrib(node, 'srcSet')
        const sz = getAttrib(node, 'sizes')
        if (ss) imgSrcSet = ss
        if (sz) imgSizes = sz
      } else if (node.name === 'a') {
        href = getAttrib(node, 'href')
        traverse(node.children as DOMNode[])
      } else if (node.name === 'figcaption') {
        caption = <Caption>{getTextContent(node)}</Caption>
      } else if (node.children) {
        traverse(node.children as DOMNode[])
      }
    }
  }

  traverse(domNode.children as DOMNode[])

  if (!imgSrc) return <figure className={className}>{domToReact(domNode.children as DOMNode[])}</figure>

  const isImageHref = href && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(href)

  const imageEl = (
    <Image
      src={imgSrc}
      alt={imgAlt}
      {...(imgWidth ? { width: imgWidth } : {})}
      {...(imgHeight ? { height: imgHeight } : {})}
      {...(imgSrcSet ? { srcSet: imgSrcSet } : {})}
      {...(imgSizes ? { sizes: imgSizes } : {})}
      className={className}
      rounded="rounded-sm"
      {...(isImageHref ? { href } : href ? {} : { mediaLink: true })}
    />
  )

  const figureAlign = tailwindGetAlignClasses(className)

  return (
    <figure className={`mb-7 ${className} ${figureAlign}`}>
      {href && !isImageHref ? (
        <Link href={href} scroll prefetch={false}>
          {imageEl}
        </Link>
      ) : (
        imageEl
      )}
      {caption}
    </figure>
  )
}
