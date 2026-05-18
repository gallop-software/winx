import { type DOMNode, Element } from 'html-react-parser'

export function isTag(node: any): node is Element {
  return node.type === 'tag'
}

export function hasExactClass(
  className: string | undefined,
  target: string
): boolean {
  if (!className) return false
  return new RegExp(`(^|\\s)${target}(\\s|$)`).test(className)
}

export function getAttrib(node: Element, name: string): string {
  return node.attribs?.[name] || ''
}

export function getClassName(node: Element): string {
  return getAttrib(node, 'class')
}

export function findDeep(
  children: DOMNode[],
  tagName: string
): Element | undefined {
  for (const child of children) {
    if (isTag(child) && child.name === tagName) return child
    if (isTag(child) && child.children) {
      const found = findDeep(child.children as DOMNode[], tagName)
      if (found) return found
    }
  }
  return undefined
}

export function getTextContent(node: any): string {
  if (node.type === 'text') return node.data || ''
  if (node.children) {
    return node.children.map(getTextContent).join('')
  }
  return ''
}
