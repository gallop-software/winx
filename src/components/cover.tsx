import { clsx } from 'clsx'
import { Image } from '@/components/image'
import { Container } from '@/components/container'
import { Parallax, type ParallaxSpeed } from '@/components/parallax'
import {
  type DOMNode,
  Element,
  type HTMLReactParserOptions,
  domToReact,
} from 'html-react-parser'
import { isTag, getAttrib } from '@/utils/parse-blocks-helpers'

interface CoverProps {
  imageSrc?: string
  imageAlt?: string
  imageClassName?: string
  children?: React.ReactNode
  overlayColor?: string
  backgroundColor?: string
  height?: string
  className?: string
  innerAlign?: 'wide' | 'none' | 'content' | 'full' | 'navbar' | undefined
  parallax?: boolean | ParallaxSpeed
  id?: string
}

export function Cover({
  imageSrc,
  imageAlt,
  imageClassName,
  children,
  overlayColor,
  backgroundColor,
  height,
  className,
  innerAlign,
  parallax = false,
  id,
}: CoverProps) {
  const parallaxSpeed: ParallaxSpeed =
    typeof parallax === 'string' ? parallax : 'medium'

  return (
    <div
      id={id}
      className={clsx(
        backgroundColor || 'bg-body2',
        className,
        'relative w-full overflow-hidden z-0',
        '[&>*>*>*:last-child]:mb-0',
        height || 'h-[500px] md:h-[600px] lg:h-[800px]'
      )}
    >
      {imageSrc && (
        <>
          {parallax ? (
            <Parallax
              speed={parallaxSpeed}
              className="absolute inset-0"
            >
              <Image
                src={imageSrc}
                size="full"
                alt={imageAlt || ''}
                rounded="rounded-none"
                className={clsx('object-center', imageClassName)}
              />
            </Parallax>
          ) : (
            <Image
              src={imageSrc}
              size="full"
              alt={imageAlt || ''}
              className={clsx(
                'object-cover object-center absolute inset-0 w-full h-full',
                imageClassName
              )}
            />
          )}
          <div
            className={clsx(
              'absolute inset-0',
              overlayColor || 'bg-overlay/30'
            )}
          ></div>
        </>
      )}
      <Container
        className={clsx(
          'relative flex flex-col items-center justify-center h-full w-full'
        )}
        align={innerAlign}
      >
        {children && children}
      </Container>
    </div>
  )
}

export function coreCover(
  domNode: Element,
  options: HTMLReactParserOptions,
  className: string
) {
  let bgUrl = ''
  for (const child of domNode.children as DOMNode[]) {
    if (isTag(child) && child.name === 'img') {
      bgUrl = getAttrib(child, 'src')
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg my-7 min-h-[300px] flex items-center justify-center ${className}`}
      {...(bgUrl ? { style: { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } } : {})}
    >
      <div className="relative z-10 p-8">
        {domToReact(domNode.children as DOMNode[], options)}
      </div>
    </div>
  )
}
