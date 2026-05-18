import {
  type DOMNode,
  Element,
  type HTMLReactParserOptions,
  domToReact,
} from 'html-react-parser'
import { getTextContent } from '@/utils/parse-blocks-helpers'

interface CodeBlockProps {
  className?: string
  children: React.ReactNode
}

export function CodeBlock({ className = '', children }: CodeBlockProps) {
  return (
    <pre className={`bg-body-dark rounded-lg p-4 overflow-x-auto my-6 ${className}`}>
      {children}
    </pre>
  )
}

interface CodeInlineProps {
  className?: string
  children: React.ReactNode
}

export function CodeInline({ className = '', children }: CodeInlineProps) {
  return (
    <code className={`bg-body-dark rounded px-1.5 py-0.5 text-xs ${className}`}>
      {children}
    </code>
  )
}

export function coreCode(
  domNode: Element,
  options: HTMLReactParserOptions,
  className: string
) {
  return (
    <CodeBlock className={className}>
      {domToReact(domNode.children as DOMNode[], options)}
    </CodeBlock>
  )
}

export function tagPre(domNode: Element, className: string) {
  return (
    <CodeBlock className={className}>{getTextContent(domNode)}</CodeBlock>
  )
}

export function tagCode(domNode: Element, className: string) {
  return (
    <CodeInline className={className}>{getTextContent(domNode)}</CodeInline>
  )
}
