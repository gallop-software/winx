import { clsx } from 'clsx'

export function Gradient({
  className,
  gradient = 'from-[var(--color-body2)] from-28% via-[var(--color-accent3)] via-70% to-[var(--color-accent3-dark)]',
  ...props
}: React.ComponentPropsWithoutRef<'div'> & {
  gradient?: string
}) {
  return (
    <div
      {...props}
      className={clsx(className, 'bg-linear-115', gradient, 'sm:bg-linear-145')}
    />
  )
}

export function GradientBackground({
  gradient = 'from-[var(--color-body2)] from-28% via-[var(--color-accent3)] via-70% to-[var(--color-accent3-dark)]',
}: {
  gradient?: string
} = {}) {
  return (
    <div className="relative mx-auto max-w-7xl overflow-x-clip">
      <div
        className={clsx(
          'absolute -top-44 -right-60 h-60 w-xl transform-gpu md:right-0',
          'bg-linear-115',
          gradient,
          'rotate-[-10deg] rounded-full blur-3xl'
        )}
      />
    </div>
  )
}
