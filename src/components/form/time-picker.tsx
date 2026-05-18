'use client'

import { useState } from 'react'
import clsx from 'clsx'
import clockIcon from '@iconify/icons-heroicons/clock'
import chevronDownIcon from '@iconify/icons-heroicons/chevron-down'
import { Icon } from '@/components/icon'
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/react'
import { TIME_SLOTS, triggerButtonStyles, DEFAULT_TIMEZONE } from './utils'

// ============================================================================
// TimePicker Input Component
// ============================================================================

type TimePickerProps = {
  name: string
  placeholder?: string | undefined
  required?: boolean | undefined
  defaultValue?: string | undefined
  label?: string
  className?: string
  /** Minimum hour (0-23), inclusive. Default: 0 */
  minHour?: number | undefined
  /** Maximum hour (0-23), inclusive. Default: 23 */
  maxHour?: number | undefined
  /** Maximum minute for the max hour (0-50 in 10-min increments). Default: 50 */
  maxMinute?: number | undefined
  /** Time interval in minutes (5, 10, 15, 30, 60). Default: 10 */
  interval?: 5 | 10 | 15 | 30 | 60 | undefined
  /** Timezone for time calculations (e.g., "America/New_York"). Default: America/New_York */
  timezone?: string | undefined
}

export function TimePickerInput({
  name,
  placeholder = 'Select time',
  required,
  defaultValue,
  label = '',
  className = '',
  minHour = 0,
  maxHour = 23,
  maxMinute = 50,
  interval = 10,
  timezone: _timezone = DEFAULT_TIMEZONE,
}: TimePickerProps) {
  const [selectedTime, setSelectedTime] = useState<string | null>(
    defaultValue || null
  )

  // Filter time slots based on min/max hours, max minute, and interval
  const filteredSlots = TIME_SLOTS.filter((slot) => {
    if (slot.hour < minHour) return false
    if (slot.hour > maxHour) return false
    if (slot.hour === maxHour && slot.minute > maxMinute) return false
    // Filter by interval (only include minutes divisible by interval)
    if (slot.minute % interval !== 0) return false
    return true
  })

  const selectedSlot = filteredSlots.find((s) => s.value === selectedTime)

  return (
    <Listbox
      value={selectedTime}
      onChange={setSelectedTime}
    >
      <div className="relative">
        <input
          type="hidden"
          name={name}
          value={selectedTime || ''}
          data-label={label}
          required={required}
        />

        {/* Trigger button */}
        <ListboxButton className={clsx(triggerButtonStyles, className)}>
          <Icon
            icon={clockIcon}
            className="w-5 h-5 text-contrast/70 shrink-0"
          />
          <span
            className={clsx(
              'flex-1 text-left',
              !selectedTime && 'text-contrast/50'
            )}
          >
            {selectedSlot ? selectedSlot.label : placeholder}
          </span>
          <Icon
            icon={chevronDownIcon}
            className="w-5 h-5 text-contrast/50 shrink-0"
          />
        </ListboxButton>

        {/* Dropdown options */}
        <ListboxOptions
          modal={false}
          className="absolute left-0 right-0 top-full mt-2 z-50 bg-body rounded-xl shadow-xl border border-contrast/10 max-h-60 overflow-y-auto focus:outline-none"
        >
          {filteredSlots.map((slot) => (
            <ListboxOption
              key={slot.value}
              value={slot.value}
              className={({ active, selected }) =>
                clsx(
                  'w-full px-4 py-3 text-left text-sm transition-colors cursor-pointer',
                  selected && 'bg-contrast/10 font-semibold text-contrast',
                  active && !selected && 'bg-contrast/5',
                  !active && !selected && 'text-contrast'
                )
              }
            >
              {slot.label}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
