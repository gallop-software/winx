import { clsx } from 'clsx'

export interface SpanProps extends React.ComponentPropsWithoutRef<'span'> {
  /** Variant of the span - controls default styling */
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
  /** Line height override */
  lineHeight?: string
  /** Text alignment override */
  textAlign?: string
  /** Margin override */
  margin?: string
  /** Additional CSS classes */
  className?: string
}

export function Span({
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
}: SpanProps) {
  // Define font size presets for variants
  const variantFontSizes = {
    default: 'text-base',
    large: 'text-base md:text-lg',
    small: 'text-xs',
  }

  // Use user-defined values if provided, otherwise use defaults
  const finalFontSize = fontSize || variantFontSizes[variant]
  const finalColor = color || 'text-contrast'
  const finalFontFamily = fontFamily || '' // no default font family
  const finalFontWeight = fontWeight || 'font-normal' // inherit font weight
  const finalFontStyle = fontStyle || '' // no default font style
  const finalLineHeight = lineHeight || 'leading-normal' // default line height
  const finalTextAlign = textAlign || '' // no default text alignment
  const finalMargin = margin || 'mb-0' // no margin by default

  return (
    <span
      className={clsx(
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
    </span>
  )
}
