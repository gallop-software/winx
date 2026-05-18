import arrowPathIcon from '@iconify/icons-heroicons/arrow-path'
import clsx from 'clsx'
import { Button } from '@/components/button'
import { Icon } from '@/components/icon'

// ============================================================================
// FormButton Component
// ============================================================================

export type FormButtonProps = {
  label: string
  name: string
  isLoading?: boolean
  submitMessage?: string
  className?: string
}

export function FormButton({
  label,
  isLoading,
  submitMessage = 'Message sent. Thank you.',
  className,
}: FormButtonProps) {
  return (
    <Button
      className={clsx(isLoading && 'opacity-70 cursor-not-allowed', className)}
      type="submit"
      data-message={submitMessage}
    >
      <span>{label}</span>
      {isLoading && (
        <Icon
          icon={arrowPathIcon}
          className="ml-2 h-5 w-5 animate-spin text-body"
          aria-hidden="true"
        />
      )}
    </Button>
  )
}
