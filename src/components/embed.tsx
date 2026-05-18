import {
  type DOMNode,
  Element,
  type HTMLReactParserOptions,
  domToReact,
} from 'html-react-parser'
import {
  isTag,
  hasExactClass,
  getClassName,
} from '@/utils/parse-blocks-helpers'
import { Caption } from '@/components/caption'

interface EmbedProps {
  className?: string
  caption?: React.ReactNode
  children?: React.ReactNode
}

export function Embed({ className = '', caption, children }: EmbedProps) {
  return (
    <figure
      className={`${className} relative w-full aspect-video mx-0 mb-7 [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:w-full [&_iframe]:h-full`}
    >
      {children}
      {caption && <Caption>{caption}</Caption>}
    </figure>
  )
}

export function coreEmbed(
  domNode: Element,
  _options: HTMLReactParserOptions,
  className: string
) {
  let wrapper: React.ReactNode = null
  let figcaption: React.ReactNode = null

  const op: HTMLReactParserOptions = {
    replace(node) {
      if (!isTag(node)) return undefined

      const cn = getClassName(node)

      if (hasExactClass(cn, 'wp-block-embed__wrapper') && !wrapper) {
        wrapper = <>{domToReact(node.children as DOMNode[], op)}</>
        return <></>
      }

      if (node.name === 'figcaption' && !figcaption) {
        figcaption = <>{domToReact(node.children as DOMNode[], op)}</>
        return <></>
      }

      return undefined
    },
  }

  domToReact(domNode.children as DOMNode[], op)

  return (
    <Embed className={className} caption={figcaption}>
      {wrapper}
    </Embed>
  )
}
