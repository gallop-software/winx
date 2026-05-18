import { clsx } from 'clsx'
import { Icon } from '@/components/icon'

type IconData = { body: string; width?: number; height?: number }

export interface ChipProps extends React.ComponentPropsWithoutRef<'span'> {
  /** Icon to display before text */
  iconBefore?: IconData
  /** Icon to display after text */
  iconAfter?: IconData
  /** Icon size */
  iconSize?: string
  /** Font size override */
  fontSize?: string
  /** Text color override */
  color?: string
  /** Background color override */
  bgColor?: string
  /** Font weight override */
  fontWeight?: string
  /** Letter spacing override */
  letterSpacing?: string
  /** Text transform override */
  textTransform?: string
  /** Border radius override */
  rounded?: string
  /** Padding override */
  padding?: string
  /** Margin override */
  margin?: string
  /** Additional CSS classes */
  className?: string
}

export function Chip({
  className = '',
  iconBefore,
  iconAfter,
  iconSize = '',
  fontSize = '',
  color = '',
  bgColor = '',
  fontWeight = '',
  letterSpacing = '',
  textTransform = '',
  rounded = '',
  padding = '',
  margin = '',
  children,
  ...props
}: ChipProps) {
  // Use user-defined values if provided, otherwise use defaults
  const finalIconSize = iconSize || 'w-4 h-4'
  const finalFontSize = fontSize || 'text-xs'
  const finalColor = color || 'text-contrast'
  const finalBgColor = bgColor || 'bg-contrast/10'
  const finalFontWeight = fontWeight || 'font-medium'
  const finalLetterSpacing = letterSpacing || 'tracking-wide'
  const finalTextTransform = textTransform || 'uppercase'
  const finalRounded = rounded || 'rounded-full'
  const finalPadding = padding || 'px-4 py-2'
  const finalMargin = margin || ''

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2',
        finalFontSize,
        finalColor,
        finalBgColor,
        finalFontWeight,
        finalLetterSpacing,
        finalTextTransform,
        finalRounded,
        finalPadding,
        finalMargin,
        className
      )}
      {...props}
    >
      {iconBefore && (
        <Icon
          icon={iconBefore}
          className={clsx(finalIconSize, 'shrink-0')}
        />
      )}
      {children}
      {iconAfter && (
        <Icon
          icon={iconAfter}
          className={clsx(finalIconSize, 'shrink-0')}
        />
      )}
    </span>
  )
}
