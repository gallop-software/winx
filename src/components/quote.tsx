import { clsx } from 'clsx'
import {
  type DOMNode,
  Element,
  type HTMLReactParserOptions,
  domToReact,
} from 'html-react-parser'
import { isTag } from '@/utils/parse-blocks-helpers'
import { tailwindGetAlignClasses } from '@/utils/tailwind-get-align-classes'

export interface QuoteProps extends React.ComponentPropsWithoutRef<'blockquote'> {
  /** Variant of the quote - controls default styling */
  variant?: 'default' | 'large' | 'small'
  /** Font size override */
  fontSize?: string
  /** Text color override */
  color?: string
  /** Font family override */
  fontFamily?: string
  /** Font weight override */
  fontWeight?: string
  /** Font style override */
  fontStyle?: string
  /** Text alignment override */
  textAlign?: string
  /** Margin override */
  margin?: string
  /** Additional CSS classes */
  className?: string
}

export function Quote({
  className = '',
  variant = 'default',
  fontSize = '',
  color = '',
  fontFamily = '',
  fontWeight = '',
  fontStyle = '',
  textAlign = '',
  margin = '',
  children,
  ...props
}: QuoteProps) {
  const variantFontSize = {
    default: 'text-xl md:text-2xl leading-snug',
    large: 'text-2xl md:text-3xl leading-snug',
    small: 'text-lg leading-snug',
  }

  const finalFontSize = fontSize || variantFontSize[variant]
  const finalColor = color || 'text-contrast'
  const finalFontFamily = fontFamily || 'font-heading'
  const finalFontWeight = fontWeight || 'font-normal'
  const finalFontStyle = fontStyle || 'not-italic'
  const finalTextAlign = textAlign || ''
  const finalMargin = margin || 'my-8'

  const isRightAligned = `${className} ${finalTextAlign}`.includes('text-right')
  const borderClasses = isRightAligned
    ? 'border-r-4 border-contrast pr-5 md:pr-6'
    : 'border-l-4 border-contrast pl-5 md:pl-6'

  return (
    <blockquote
      className={clsx(
        borderClasses,
        finalFontSize,
        finalColor,
        finalFontFamily,
        finalFontWeight,
        finalFontStyle,
        finalTextAlign,
        finalMargin,
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  )
}

export function coreQuote(
  domNode: Element,
  options: HTMLReactParserOptions,
  className: string
) {
  let cite: React.ReactNode = null
  const contentNodes: DOMNode[] = []

  for (const child of domNode.children as DOMNode[]) {
    if (isTag(child) && child.name === 'cite') {
      cite = domToReact(child.children as DOMNode[], options)
    } else {
      contentNodes.push(child)
    }
  }

  const alignClasses = tailwindGetAlignClasses(className)

  return (
    <Quote className={`${className} ${alignClasses}`.trim()}>
      {domToReact(contentNodes, options)}
      {cite && (
        <footer className="text-sm text-contrast-light mt-3 not-italic font-body">
          — {cite}
        </footer>
      )}
    </Quote>
  )
}
