import { clsx } from 'clsx'
import { Icon } from '@/components/icon'
import {
  type DOMNode,
  Element,
  type HTMLReactParserOptions,
  domToReact,
} from 'html-react-parser'
import { isTag } from '@/utils/parse-blocks-helpers'

export interface ListProps extends React.ComponentPropsWithoutRef<'ul'> {
  /** Variant of the list - controls default styling */
  variant?: 'default' | 'bulleted' | 'numbered' | 'unstyled'
  /** Custom spacing between list items */
  spacing?: 'tight' | 'normal' | 'loose'
  /** Gap override - provide full Tailwind classes like 'gap-4' or 'gap-x-8 gap-y-4' */
  gap?: string
  /** Font size override */
  fontSize?: string
  /** Text color override */
  color?: string | undefined
  /** Font family override */
  fontFamily?: string
  /** Font weight override */
  fontWeight?: string
  /** Font style override */
  fontStyle?: string
  /** Line height override */
  lineHeight?: string
  /** Text alignment override */
  textAlign?: string
  /** Margin override */
  margin?: string
  /** Additional CSS classes */
  className?: string
  /** Whether to render as ordered list (ol) or unordered list (ul) */
  ordered?: boolean
}

export interface LiProps extends React.ComponentPropsWithoutRef<'li'> {
  /** Additional CSS classes */
  className?: string
  /** Icon component or iconify icon object to display before text */
  icon?:
    | React.ComponentType<{ className?: string }>
    | { body: string; width?: number; height?: number }
  /** Icon size - default is 'w-5 h-5' */
  iconSize?: string
  /** Gap between icon and text - default is 'gap-x-3' */
  iconGap?: string
}

export function List({
  className = '',
  variant = 'default',
  spacing = 'normal',
  gap = '',
  fontSize = '',
  color = '',
  fontFamily = '',
  fontWeight = '',
  fontStyle = '',
  lineHeight = '',
  textAlign = '',
  margin = '',
  ordered = false,
  children,
  ...props
}: ListProps) {
  const variantClasses = {
    default: 'list-disc',
    bulleted: 'list-disc',
    numbered: 'list-decimal',
    unstyled: 'list-none',
  }

  const spacingClasses = {
    tight: 'space-y-1',
    normal: 'space-y-2',
    loose: 'space-y-4',
  }

  const variantFontSizes = {
    default: 'text-xs',
    bulleted: 'text-xs',
    numbered: 'text-xs',
    unstyled: 'text-xs',
  }

  // Use user-defined values if provided, otherwise use defaults
  const finalFontSize = fontSize || variantFontSizes[variant]
  const finalColor = color || 'text-contrast'
  const finalFontFamily = fontFamily || '' // no default font family
  const finalFontWeight = fontWeight || 'font-normal' // default font weight
  const finalFontStyle = fontStyle || '' // no default font style
  const finalLineHeight = lineHeight || 'leading-normal' // default line height
  const finalTextAlign = textAlign || '' // no default text alignment
  const finalMargin = margin || 'mb-8'
  const finalGap = gap || 'gap-y-2'

  const Component = ordered ? 'ol' : 'ul'

  return (
    <Component
      className={clsx(
        'content-wrapper [&>li]:mb-0 grid',
        '[&_a:not(.gallop-button)]:text-accent [&_a:not(.gallop-button)]:underline',
        ordered ? 'list-decimal' : variantClasses[variant],
        spacingClasses[spacing],
        variant !== 'unstyled' && '[&>li]:ml-6',
        finalFontSize,
        finalColor,
        finalFontFamily,
        finalFontWeight,
        finalFontStyle,
        finalLineHeight,
        finalTextAlign,
        finalMargin,
        finalGap,
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

export function Li({
  className = '',
  icon,
  iconSize = 'w-5 h-5',
  iconGap = 'gap-x-3',
  children,
  ...props
}: LiProps) {
  const isIconifyIcon = icon && typeof icon === 'object' && 'body' in icon
  const IconComponent = !isIconifyIcon
    ? (icon as React.ComponentType<{ className?: string }>)
    : null

  return (
    <li
      className={clsx(
        '[&>ul]:mt-2',
        icon && 'flex',
        icon && iconGap,
        className
      )}
      {...props}
    >
      {isIconifyIcon && (
        <Icon
          icon={icon as { body: string; width?: number; height?: number }}
          className={clsx(iconSize, 'flex-none mt-1.5')}
        />
      )}
      {IconComponent && (
        <IconComponent className={clsx(iconSize, 'flex-none mt-1.5')} />
      )}
      {icon ? <span>{children}</span> : children}
    </li>
  )
}

export function coreList(
  domNode: Element,
  options: HTMLReactParserOptions,
  className: string,
  type: 'ul' | 'ol'
) {
  const op: HTMLReactParserOptions = {
    replace(node) {
      if (!isTag(node)) return undefined

      if (node.name === 'li') {
        return (
          <Li>
            {domToReact(node.children as DOMNode[], options)}
          </Li>
        )
      }

      return undefined
    },
  }

  const content = domToReact(domNode.children as DOMNode[], op)

  return (
    <List
      ordered={type === 'ol'}
      variant={type === 'ol' ? 'numbered' : 'bulleted'}
      className={className}
    >
      {content}
    </List>
  )
}
