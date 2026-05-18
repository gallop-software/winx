import { clsx } from 'clsx'
import { Icon } from '@/components/icon'

export interface IconTextProps extends React.ComponentPropsWithoutRef<'p'> {
  /** Variant of the paragraph - controls default styling */
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
  /** Icon object to display */
  icon?: { body: string; width?: number; height?: number }
  /** Icon placement - before or after text */
  iconPlacement?: 'before' | 'after'
  /** Icon size classes */
  iconSize?: string
  /** Additional CSS classes */
  className?: string
}

export function IconText({
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
  icon,
  iconPlacement = 'before',
  iconSize = 'w-5 h-5',
  children,
  ...props
}: IconTextProps) {
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
  const finalFontWeight = fontWeight || 'font-medium' // default font weight
  const finalFontStyle = fontStyle || '' // no default font style
  const finalLineHeight = lineHeight || 'leading-normal' // default line height
  const finalTextAlign = textAlign || '' // no default text alignment
  const finalMargin = margin || 'mb-8'

  const iconElement = icon ? (
    <Icon
      icon={icon}
      className={clsx(
        iconSize,
        'inline-block',
        iconPlacement === 'before' && children ? 'mr-1' : '',
        iconPlacement === 'after' && children ? 'ml-1' : ''
      )}
    />
  ) : null

  return (
    <p
      className={clsx(
        'content-wrapper',
        icon && 'flex items-center',
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
      {iconPlacement === 'before' && iconElement}
      {children}
      {iconPlacement === 'after' && iconElement}
    </p>
  )
}
