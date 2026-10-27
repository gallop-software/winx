'use client'

import { useState } from 'react'
import clsx from 'clsx'
import eyeIcon from '@iconify/icons-heroicons/eye'
import eyeSlashIcon from '@iconify/icons-heroicons/eye-slash'
import { Icon } from '@/components/icon'
import { inputBaseStyles } from './utils'

type FormPasswordProps = {
  id: string
  name: string
  placeholder?: string | undefined
  autoComplete?: string | undefined
  required?: boolean | undefined
  className?: string
  label?: string
}

// A password field with an eye at its end: press it to read what was typed,
// press it again to hide it. The field keeps its name and its value either
// way, so a form sends the same thing.
export function FormPassword({
  id,
  name,
  placeholder,
  autoComplete,
  required,
  className = '',
  label = '',
}: FormPasswordProps) {
  const [shown, setShown] = useState(false)

  return (
    <div className="relative w-full">
      <input
        id={id}
        name={name}
        type={shown ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        data-label={label}
        // Shown or not, it is still a password: nothing should correct it.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={clsx(inputBaseStyles, 'pr-9', className)}
      />
      <button
        type="button"
        onClick={() => setShown((now) => !now)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        aria-controls={id}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-contrast/60 hover:text-contrast focus-visible:text-contrast outline-none cursor-pointer transition"
      >
        <Icon icon={shown ? eyeSlashIcon : eyeIcon} className="w-4 h-4" />
      </button>
    </div>
  )
}
