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

// True when nothing in these nodes would be seen: only whitespace, comments,
// and elements that hold nothing themselves. Content saved with block
// markup trapped inside paragraphs renders as hundreds of empty ones, and an
// embed whose address was lost renders as an empty box; neither is shown.
export function isBlank(children: DOMNode[] | undefined): boolean {
  if (!children) return true
  for (const child of children) {
    if (child.type === 'text') {
      if ((child as { data?: string }).data?.replace(/\u00a0/g, '').trim()) {
        return false
      }
      continue
    }
    if (child.type === 'comment') continue
    if (isTag(child)) {
      if (['img', 'iframe', 'video', 'audio', 'svg', 'hr', 'input'].includes(child.name)) {
        return false
      }
      if (!isBlank(child.children as DOMNode[])) return false
    }
  }
  return true
}
