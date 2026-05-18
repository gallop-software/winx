import {
  type DOMNode,
  Element,
  type HTMLReactParserOptions,
  domToReact,
} from 'html-react-parser'
import { isTag } from '@/utils/parse-blocks-helpers'

interface TableProps {
  className?: string
  children: React.ReactNode
}

export function Table({ className = '', children }: TableProps) {
  return (
    <div className={`overflow-x-auto my-6 ${className}`}>
      <table className="min-w-full divide-y divide-body-dark">
        {children}
      </table>
    </div>
  )
}

export function coreTable(
  domNode: Element,
  options: HTMLReactParserOptions,
  className: string
) {
  let isFirstTh = true
  let isFirstTd = true

  const op: HTMLReactParserOptions = {
    replace(node) {
      if (!isTag(node)) return undefined

      if (node.name === 'thead') {
        return <thead>{domToReact(node.children as DOMNode[], op)}</thead>
      }

      if (node.name === 'tbody') {
        return (
          <tbody className="divide-y divide-body-dark">
            {domToReact(node.children as DOMNode[], op)}
          </tbody>
        )
      }

      if (node.name === 'tr') {
        isFirstTh = true
        isFirstTd = true
        const content = domToReact(node.children as DOMNode[], op)
        isFirstTh = true
        isFirstTd = true
        return <tr>{content}</tr>
      }

      if (node.name === 'th') {
        const first = isFirstTh
        isFirstTh = false
        return (
          <th
            scope="col"
            className={`py-3.5 text-left text-xs font-semibold text-contrast ${first ? 'pr-3 pl-4 sm:pl-0' : 'px-3'}`}
          >
            {domToReact(node.children as DOMNode[], options)}
          </th>
        )
      }

      if (node.name === 'td') {
        const first = isFirstTd
        isFirstTd = false
        return (
          <td
            className={`py-4 text-xs whitespace-nowrap text-contrast-light ${first ? 'pr-3 pl-4 font-medium sm:pl-0' : 'px-3'}`}
          >
            {domToReact(node.children as DOMNode[], options)}
          </td>
        )
      }

      if (node.name === 'table') {
        return (
          <table className="min-w-full divide-y divide-body-dark">
            {domToReact(node.children as DOMNode[], op)}
          </table>
        )
      }

      return undefined
    },
  }

  const tableNode = (domNode.children as Element[]).find(
    (c) => isTag(c) && c.name === 'table'
  )

  const content = tableNode
    ? domToReact(tableNode.children as DOMNode[], op)
    : domToReact(domNode.children as DOMNode[], op)

  return <Table className={className}>{content}</Table>
}
