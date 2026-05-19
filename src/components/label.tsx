import { clsx } from 'clsx'

export interface LabelProps extends React.ComponentPropsWithoutRef<'p'> {
  /** Variant of the label - controls default styling */
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
  /** Letter spacing override */
  letterSpacing?: string
  /** Text transform override */
  textTransform?: string
  /** Text alignment override */
  textAlign?: string
  /** Margin override */
  margin?: string
  /** Additional CSS classes */
  className?: string
}

export function Label({
  className = '',
  variant = 'default',
  fontSize = '',
  color = '',
  fontFamily = '',
  fontWeight = '',
  fontStyle = '',
  lineHeight = '',
  letterSpacing = '',
  textTransform = '',
  textAlign = '',
  margin = '',
  children,
  ...props
}: LabelProps) {
  // Define font size presets for variants
  const variantFontSizes = {
    default: 'text-xs',
    large: 'text-xs',
    small: 'text-[10px]',
  }

  // Use user-defined values if provided, otherwise use defaults
  const finalFontSize = fontSize || variantFontSizes[variant]
  const finalColor = color || 'text-accent2'
  const finalFontFamily = fontFamily || '' // no default font family
  const finalFontWeight = fontWeight || 'font-semibold' // default font weight
  const finalFontStyle = fontStyle || '' // no default font style
  const finalLineHeight = lineHeight || 'leading-normal' // default line height
  const finalLetterSpacing = letterSpacing || 'tracking-[0.18em]' // default letter spacing
  const finalTextTransform = textTransform || 'uppercase' // default text transform
  const finalTextAlign = textAlign || '' // no default text alignment
  const finalMargin = margin || '' // no default margin for labels

  return (
    <p
      className={clsx(
        finalFontSize,
        finalColor,
        finalFontFamily,
        finalFontWeight,
        finalFontStyle,
        finalLineHeight,
        finalLetterSpacing,
        finalTextTransform,
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
