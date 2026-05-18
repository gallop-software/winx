import { inputBaseStyles } from './utils'

// ============================================================================
// FormTextArea Component
// ============================================================================

export type FormTextAreaProps = {
  id?: string
  name: string
  placeholder?: string
  rows?: number
  required?: boolean
  defaultValue?: string
  className?: string
  label?: string
}

export function FormTextArea({
  id,
  name,
  placeholder,
  rows = 4,
  required,
  defaultValue,
  className = '',
  label = '',
}: FormTextAreaProps) {
  return (
    <textarea
      id={id ?? name}
      name={name}
      placeholder={placeholder}
      rows={rows}
      required={required}
      defaultValue={defaultValue}
      data-label={label}
      className={`${inputBaseStyles} ${className}`}
    />
  )
}
