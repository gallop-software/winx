import { Paragraph } from '@/components/paragraph'
import { Button as HeadlessButton } from '@headlessui/react'
import { clsx } from 'clsx'
import { Link } from '@/components/link'
import { Icon } from '@/components/icon'

const variants = {
  primary: {
    light: clsx(
      'inline-flex items-center justify-center',
      'rounded-md border border-transparent bg-accent shadow-md',
      'text-accent-contrast',
      'disabled:bg-accent disabled:opacity-40 hover:bg-accent-dark',
      'transition-colors duration-200'
    ),
    dark: clsx(
      'inline-flex items-center justify-center',
      'rounded-md border border-transparent bg-body shadow-md',
      'text-contrast-dark',
      'disabled:bg-body disabled:opacity-40 hover:bg-body-light',
      'transition-colors duration-200'
    ),
  },
  secondary: {
    light: clsx(
      'relative inline-flex items-center justify-center',
      'rounded-md border border-transparent bg-body/35 shadow-md ring-1 ring-accent4-light/15',
      'after:absolute after:inset-0 after:after:shadow-[inset_0_0_2px_1px_#ffffff4d]',
      'text-contrast-dark',
      'disabled:bg-body/25 disabled:opacity-40 hover:bg-body/25',
      'transition-colors duration-200'
    ),
    dark: clsx(
      'relative inline-flex items-center justify-center',
      'rounded-md border border-transparent bg-contrast-dark/15 shadow-md ring-1 ring-body/15',
      'after:absolute after:inset-0 after:after:shadow-[inset_0_0_2px_1px_#00000040]',
      'text-body',
      'disabled:bg-contrast-dark/15 disabled:opacity-40 hover:bg-contrast-dark/20',
      'transition-colors duration-200'
    ),
  },
  outline: {
    light: clsx(
      'inline-flex items-center justify-center',
      'rounded-md border border-transparent shadow-sm ring-2 ring-inset ring-contrast-dark',
      'text-contrast-dark',
      'disabled:bg-transparent disabled:opacity-40 hover:bg-contrast-dark/5',
      'transition-colors duration-200'
    ),
    dark: clsx(
      'inline-flex items-center justify-center',
      'rounded-md border border-transparent shadow-sm ring-2 ring-inset ring-body',
      'text-body',
      'disabled:bg-transparent disabled:opacity-40 hover:bg-body/5',
      'transition-colors duration-200'
    ),
  },
  text: {
    light: clsx(
      'inline-flex items-center',
      'text-accent font-semibold',
      'hover:text-accent/80',
      'transition-colors duration-200'
    ),
    dark: clsx(
      'inline-flex items-center',
      'text-body font-semibold',
      'hover:text-body/80',
      'transition-colors duration-200'
    ),
  },
}

const sizes = {
  small: clsx('px-4 py-[calc(--spacing(1.5)-1px)]', 'text-xs font-medium'),
  default: clsx('px-4 py-[calc(--spacing(2)-1px)]', 'text-xs font-medium'),
  medium: clsx(
    'px-6 lg:px-8 py-[calc(--spacing(2)-1px)] lg:py-[calc(--spacing(3)-1px)]',
    'text-base font-medium'
  ),
  large: clsx(
    'px-8 lg:px-10 py-[calc(--spacing(3)-1px)] lg:py-[calc(--spacing(4)-1px)]',
    'text-lg font-medium'
  ),
}

type ButtonProps = {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  icon?: { body: string; width?: number; height?: number } | undefined
  iconPlacement?: 'before' | 'after' | undefined
  iconSize?: string
  wrap?: boolean
  dark?: boolean
  target?: '_self' | '_blank'
  native?: boolean
} & (
  | React.ComponentPropsWithoutRef<typeof Link>
  | (React.ComponentPropsWithoutRef<typeof HeadlessButton> & {
      href?: undefined
    })
)

export function Button({
  variant = 'primary',
  size = 'default',
  className,
  icon,
  iconPlacement = 'before',
  iconSize = 'w-5 h-5',
  wrap = false,
  dark = false,
  target = '_self',
  native = false,
  children,
  ...props
}: ButtonProps) {
  const variantClass = dark ? variants[variant].dark : variants[variant].light
  // Text variant doesn't use size padding
  const sizeClass = variant === 'text' ? 'text-xs' : sizes[size]
  className = clsx('gallop-button text-center', className, variantClass, sizeClass)

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

  const content = (
    <>
      {iconPlacement === 'before' && iconElement}
      {children}
      {iconPlacement === 'after' && iconElement}
    </>
  )

  const buttonElement =
    typeof props.href === 'undefined' ? (
      <HeadlessButton
        {...props}
        className={clsx('cursor-pointer', className)}
      >
        {content}
      </HeadlessButton>
    ) : native ? (
      <a
        href={props.href}
        target={target}
        className={clsx('cursor-pointer no-underline!', className)}
      >
        {content}
      </a>
    ) : (
      <Link
        {...props}
        target={target}
        className={clsx('cursor-pointer no-underline!', className)}
      >
        {content}
      </Link>
    )

  if (wrap) {
    return <Paragraph>{buttonElement}</Paragraph>
  }

  return buttonElement
}
