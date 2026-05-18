import { clsx } from 'clsx'
import {
  type DOMNode,
  type Element,
  type HTMLReactParserOptions,
  domToReact,
} from 'html-react-parser'
import { tailwindGetAlignClasses } from '@/utils/tailwind-get-align-classes'

export interface ParagraphProps extends React.ComponentPropsWithoutRef<'p'> {
  /** Variant of the paragraph - controls default styling */
  variant?: 'default' | 'large' | 'small'
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
}

export function Paragraph({
  className = '',
  variant = 'default',
  fontSize = '',
  color = '',
  fontFamily = '',
  fontWeight = '',
  fontStyle = '',
  lineHeight = '',
  textAlign = '',
  margin = '',
  children,
  ...props
}: ParagraphProps) {
  // Define font size presets for variants
  const variantFontSizes = {
    default: 'text-xs',
    large: 'text-sm md:text-base',
    small: 'text-xs',
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

  return (
    <p
      className={clsx(
        'content-wrapper',
        '[&_a:not(.gallop-button)]:text-accent [&_a:not(.gallop-button)]:underline',
        finalFontSize,
        finalColor,
        finalFontFamily,
        finalFontWeight,
        finalFontStyle,
        finalLineHeight,
        finalTextAlign,
        finalMargin,
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
}

/** Alias for Paragraph */
export { Paragraph as P }

export function coreParagraph(
  domNode: Element,
  options: HTMLReactParserOptions,
  className: string
) {
  const alignClasses = tailwindGetAlignClasses(className)
  return (
    <Paragraph className={alignClasses}>
      {domToReact(domNode.children as DOMNode[], options)}
    </Paragraph>
  )
}
