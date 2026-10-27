import { Fragment, type ReactNode } from 'react'
import { CodeBlock, CodeInline } from '@/components/code'
import { Li, List } from '@/components/list'
import { Paragraph } from '@/components/paragraph'
import { Quote } from '@/components/quote'
import type { CommentNode } from '@/utils/comment-types'

// Shows a comment's text from the tree the server made of it. Only what is
// listed here can be shown: an element is on the page because a case below
// put it there, and the only attribute taken from the comment is a link's
// address.

// Checked again, though the server has checked it: a comment that is waiting
// for approval is read back from the browser's own storage.
const SAFE_HREF = /^(https?:\/\/|mailto:)/i

function renderNodes(nodes: CommentNode[], path: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${path}.${index}`

    if (typeof node === 'string') return <Fragment key={key}>{node}</Fragment>
    if (!node || typeof node !== 'object' || !Array.isArray(node.children)) {
      return null
    }

    const children = renderNodes(node.children, key)

    switch (node.tag) {
      case 'p':
        return (
          <Paragraph key={key} margin="mb-6" color="text-contrast">
            {children}
          </Paragraph>
        )
      case 'br':
        return <br key={key} />
      case 'a':
        return typeof node.href === 'string' && SAFE_HREF.test(node.href) ? (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="nofollow ugc noopener noreferrer"
            className="text-accent underline [overflow-wrap:anywhere]"
          >
            {children}
          </a>
        ) : (
          <Fragment key={key}>{children}</Fragment>
        )
      case 'blockquote':
        return (
          <Quote
            key={key}
            fontSize="text-xs"
            fontFamily="font-body"
            margin="my-5"
            className="[&>p:last-child]:mb-0"
          >
            {children}
          </Quote>
        )
      case 'ul':
        return (
          <List key={key} margin="mb-5">
            {children}
          </List>
        )
      case 'ol':
        return (
          <List key={key} ordered variant="numbered" margin="mb-5">
            {children}
          </List>
        )
      case 'li':
        return <Li key={key}>{children}</Li>
      case 'pre':
        return (
          <CodeBlock key={key} className="my-3! text-xs">
            {children}
          </CodeBlock>
        )
      case 'code':
        return <CodeInline key={key}>{children}</CodeInline>
      case 'em':
        return <em key={key}>{children}</em>
      case 'i':
        return <i key={key}>{children}</i>
      case 'strong':
        return <strong key={key}>{children}</strong>
      case 'b':
        return <b key={key}>{children}</b>
      case 'del':
        return <del key={key}>{children}</del>
      case 's':
        return <s key={key}>{children}</s>
      case 'cite':
        return <cite key={key}>{children}</cite>
      case 'q':
        return <q key={key}>{children}</q>
      case 'abbr':
        return <abbr key={key}>{children}</abbr>
      default:
        return null
    }
  })
}

export function CommentBody({ nodes }: { nodes: CommentNode[] }) {
  // Text that is not inside a paragraph is given the look of one.
  return (
    <div className="text-xs leading-relaxed text-contrast [overflow-wrap:anywhere] [&>*:last-child]:mb-0">
      {renderNodes(nodes, 'c')}
    </div>
  )
}
