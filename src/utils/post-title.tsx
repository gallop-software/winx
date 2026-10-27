import type { ReactNode } from 'react'
import parse, {
  type DOMNode,
  domToReact,
  Element,
  type HTMLReactParserOptions,
} from 'html-react-parser'
import { decodeEntities } from '@/utils/html-text'

// A post's title is HTML from WordPress, and a few titles carry a line break
// or some emphasis in it. The inline elements below are kept, without their
// attributes; anything else is dropped and what is inside it kept.
const KEPT: ReadonlySet<string> = new Set([
  'br',
  'em',
  'i',
  'strong',
  'b',
  'sub',
  'sup',
  'span',
])

const options: HTMLReactParserOptions = {
  replace(domNode) {
    if (!(domNode instanceof Element)) return undefined
    const children = domToReact(domNode.children as DOMNode[], options)
    if (!KEPT.has(domNode.name)) return <>{children}</>
    if (domNode.name === 'br') return <br />
    const Tag = domNode.name as keyof React.JSX.IntrinsicElements
    return <Tag>{children}</Tag>
  },
}

// The title as it is shown. A title with no markup, which is nearly all of
// them, is returned as a string with its entities decoded (WordPress writes
// an apostrophe as &#039;), so a heading can still take its id from it.
export function renderPostTitle(title: string): ReactNode {
  if (!title.includes('<')) return decodeEntities(title)
  return parse(title, options)
}
