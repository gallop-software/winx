'use client'

import clsx from 'clsx'

interface QuietButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

// A full-width button for the other things a form or card can do: the same
// box as the main button, easy to press with a thumb, and clearly not the
// main action.
export function QuietButton({ onClick, disabled, className, children }: QuietButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...(disabled ? { disabled: true } : {})}
      className={clsx(
        'inline-flex w-full items-center justify-center rounded-md border border-contrast/20 bg-body px-4 py-2 text-xs font-medium text-contrast hover:bg-body2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  )
}
