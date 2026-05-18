import React from 'react'
import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'
import { generateIdFromChildren } from '@/tools/generate-id-from-children'

type SubheadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div'

interface SubheadingProps extends HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode
  className?: string
  /** Custom ID for the subheading. If not provided, will be auto-generated from children content */
  id?: string
  /** The HTML tag to render (h1, h2, h3, h4, h5, h6, p, div) */
  as?: SubheadingLevel
  /** Font size override */
  fontSize?: string
  /** Font weight override */
  fontWeight?: string
  /** Letter spacing override */
  letterSpacing?: string
  /** Text wrap behavior */
  textWrap?: string
  /** Font family override */
  fontFamily?: string
  /** Text color override */
  color?: string
  /** Margin override */
  margin?: string
  /** Text alignment override */
  textAlign?: string
  /** Text transform override */
  textTransform?: string
}

export function Subheading({
  children = '',
  className,
  id,
  as: Element = 'p',
  fontSize = '',
  fontWeight = '',
  letterSpacing = '',
  textWrap = '',
  fontFamily = '',
  color = '',
  margin = '',
  textAlign = '',
  textTransform = '',
  ...props
}: SubheadingProps) {
  // Define consistent default styles for all subheadings
  const defaults = {
    fontSize: 'text-lg',
    fontWeight: 'font-semibold',
    letterSpacing: 'tracking-tight',
    textWrap: 'leading-relaxed',
    fontFamily: 'font-heading',
    color: 'text-accent',
    margin: 'mb-0',
    textTransform: 'normal',
  }

  // Use user-defined values if provided, otherwise use defaults
  const finalFontSize = fontSize || defaults.fontSize
  const finalFontWeight = fontWeight || defaults.fontWeight
  const finalLetterSpacing = letterSpacing || defaults.letterSpacing
  const finalTextWrap = textWrap || defaults.textWrap
  const finalFontFamily = fontFamily || defaults.fontFamily
  const finalColor = color || defaults.color
  const finalMargin = margin || defaults.margin
  const finalTextAlign = textAlign
  const finalTextTransform = textTransform || defaults.textTransform

  // Generate ID from children if not provided
  const subheadingId = id || generateIdFromChildren(children)

  return (
    <Element
      id={subheadingId}
      className={clsx(
        'content-wrapper',
        // Apply final styles (user-defined or defaults)
        finalFontSize,
        finalFontWeight,
        finalLetterSpacing,
        finalTextWrap,
        finalFontFamily,
        finalColor,
        finalMargin,
        finalTextAlign,
        finalTextTransform,
        // Custom className can override or extend default styles
        className
      )}
      {...props}
    >
      {children}
    </Element>
  )
}
