import { inputBaseStyles } from './utils'
import { FormInput } from './form-input'

// ============================================================================
// FormName Component (First + Last Name)
// ============================================================================

export type FormNameProps = {
  name1: string
  name2: string
  placeholder1?: string
  placeholder2?: string
  requiredFirst?: boolean
  requiredSecond?: boolean
  className?: string
  label1?: string
  label2?: string
}

export function FormName({
  name1,
  name2,
  placeholder1,
  placeholder2,
  requiredFirst,
  requiredSecond,
  className = '',
  label1 = '',
  label2 = '',
}: FormNameProps) {
  return (
    <div className={`flex gap-4 ${className}`}>
      <input
        id={name1}
        name={name1}
        type="text"
        placeholder={placeholder1}
        required={requiredFirst}
        data-label={label1}
        className={inputBaseStyles}
      />
      <input
        id={name2}
        name={name2}
        type="text"
        placeholder={placeholder2}
        required={requiredSecond}
        data-label={label2}
        className={inputBaseStyles}
      />
    </div>
  )
}

// ============================================================================
// FormFirstName Component
// ============================================================================

export type FormFirstNameProps = {
  name?: string
  placeholder?: string
  required?: boolean
  className?: string
  label?: string
}

export function FormFirstName({
  name = 'firstName',
  placeholder = 'First Name',
  required = false,
  className = '',
  label = 'First Name',
}: FormFirstNameProps) {
  return (
    <FormInput
      name={name}
      placeholder={placeholder}
      required={required}
      className={className}
      label={label}
    />
  )
}

// ============================================================================
// FormLastName Component
// ============================================================================

export type FormLastNameProps = {
  name?: string
  placeholder?: string
  required?: boolean
  className?: string
  label?: string
}

export function FormLastName({
  name = 'lastName',
  placeholder = 'Last Name',
  required = false,
  className = '',
  label = 'Last Name',
}: FormLastNameProps) {
  return (
    <FormInput
      name={name}
      placeholder={placeholder}
      required={required}
      className={className}
      label={label}
    />
  )
}
