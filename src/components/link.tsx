import NextLink, { type LinkProps } from 'next/link'
import { forwardRef } from 'react'
import { Icon } from '@/components/icon'
import { clsx } from 'clsx'
import {
  type DOMNode,
  Element,
  type HTMLReactParserOptions,
  domToReact,
} from 'html-react-parser'
import { getAttrib } from '@/utils/parse-blocks-helpers'
import { replaceProductionUrl } from '@/utils/replace-production-url'

type LinkWithIconProps = LinkProps &
  React.ComponentPropsWithoutRef<'a'> & {
    icon?: { body: string; width?: number; height?: number }
    iconPlacement?: 'before' | 'after'
    iconSize?: string
  }

export const Link = forwardRef(function Link(
  {
    icon,
    iconPlacement = 'after',
    iconSize = 'w-5 h-5',
    children,
    className,
    ...props
  }: LinkWithIconProps,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  const iconElement = icon ? (
    <Icon
      icon={icon}
      className={clsx(
        iconSize,
        iconPlacement === 'before' && children ? 'mr-2' : '',
        iconPlacement === 'after' && children ? 'ml-2' : ''
      )}
    />
  ) : null

  return (
    <NextLink
      ref={ref}
      className={className}
      {...props}
    >
      {iconPlacement === 'before' && iconElement}
      {children}
      {iconPlacement === 'after' && iconElement}
    </NextLink>
  )
})

export function tagAnchor(
  domNode: Element,
  options: HTMLReactParserOptions,
  className: string
) {
  const href = replaceProductionUrl(getAttrib(domNode, 'href'))
  const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL
  const isExternal =
    (href.startsWith('http://') || href.startsWith('https://')) &&
    !(productionUrl && href.startsWith(productionUrl))
  const mergedClassName = clsx('break-words [overflow-wrap:anywhere]', className)

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={mergedClassName}
      >
        {domToReact(domNode.children as DOMNode[], options)}
      </a>
    )
  }

  return (
    <NextLink href={href} className={mergedClassName}>
      {domToReact(domNode.children as DOMNode[], options)}
    </NextLink>
  )
}
