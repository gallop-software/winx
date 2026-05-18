import {
  type DOMNode,
  Element,
  type HTMLReactParserOptions,
  domToReact,
} from 'html-react-parser'

interface GroupProps {
  className?: string
  children: React.ReactNode
}

export function Group({ className = '', children }: GroupProps) {
  return <div className={`mb-10 ${className}`}>{children}</div>
}

export function coreGroup(
  domNode: Element,
  options: HTMLReactParserOptions,
  className: string
) {
  return (
    <Group className={className}>
      {domToReact(domNode.children as DOMNode[], options)}
    </Group>
  )
}
