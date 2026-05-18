import { clsx } from 'clsx'

export function Container({
  className,
  children,
  align = 'wide',
  maxWidth,
  padding,
}: {
  className?: string
  children: React.ReactNode
  align?: 'wide' | 'none' | 'content' | 'full' | 'navbar' | undefined
  maxWidth?: string
  padding?: string
}) {
  const alignClasses = {
    wide: 'max-w-2xl',
    content: 'max-w-4xl',
    none: '',
    full: '',
    navbar: 'max-w-[1740px]',
  }

  // Use maxWidth prop if provided, otherwise use alignClasses
  const finalMaxWidth = maxWidth || alignClasses[align]

  // Use padding prop if provided, otherwise use default (px-0 for full, px-6 lg:px-8 for others)
  const defaultPadding = 'px-0'
  const finalPadding = padding || defaultPadding

  return (
    <div className={clsx(className, finalPadding)}>
      <div className={clsx('mx-auto', finalMaxWidth)}>{children}</div>
    </div>
  )
}
