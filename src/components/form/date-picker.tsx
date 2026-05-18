'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { DateTime } from 'luxon'
import calendarIcon from '@iconify/icons-heroicons/calendar'
import chevronDownIcon from '@iconify/icons-heroicons/chevron-down'
import chevronLeftIcon from '@iconify/icons-heroicons/chevron-left'
import chevronRightIcon from '@iconify/icons-heroicons/chevron-right'
import { Icon } from '@/components/icon'
import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react'
import {
  DAYS,
  MONTHS,
  getDaysInMonth,
  getFirstDayOfMonth,
  formatDate,
  formatDateValue,
  triggerButtonStyles,
  isDatePast,
  isDateToday,
  isCurrentOrPastMonth,
  DEFAULT_TIMEZONE,
} from './utils'

// ============================================================================
// Calendar Grid Component
// ============================================================================

type CalendarProps = {
  selectedDate: DateTime | null
  onSelect: (date: DateTime) => void
  viewDate: DateTime
  timezone: string
}

function Calendar({
  selectedDate,
  onSelect,
  viewDate,
  timezone,
}: CalendarProps) {
  const year = viewDate.year
  const month = viewDate.month - 1 // Convert to 0-indexed for utility functions
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  // Build days array with padding for consistent 6-row height
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  while (days.length < 42) days.push(null) // Pad to 6 rows × 7 days

  const isSelected = (day: number) => {
    if (!selectedDate || !day) return false
    return (
      selectedDate.year === year &&
      selectedDate.month - 1 === month &&
      selectedDate.day === day
    )
  }

  const isToday = (day: number) => {
    if (!day) return false
    return isDateToday(year, month, day, timezone)
  }

  const isPast = (day: number) => {
    if (!day) return false
    return isDatePast(year, month, day, timezone)
  }

  return (
    <div className="w-full lg:w-96">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs text-contrast/50 font-semibold py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day buttons */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, i) => (
          <div
            key={i}
            className="flex justify-center"
          >
            <button
              type="button"
              disabled={!day || isPast(day)}
              onClick={() =>
                day &&
                onSelect(
                  DateTime.fromObject(
                    { year, month: month + 1, day },
                    { zone: timezone }
                  )
                )
              }
              className={clsx(
                'w-12 h-12 flex items-center justify-center text-sm rounded-full transition-colors',
                !day && 'invisible',
                day && isPast(day) && 'text-contrast/30 cursor-not-allowed',
                day &&
                  !isPast(day) &&
                  !isSelected(day) &&
                  'text-contrast hover:bg-contrast/10 cursor-pointer',
                day &&
                  isSelected(day) &&
                  'bg-contrast text-body font-semibold hover:bg-contrast/80 cursor-pointer',
                day &&
                  isToday(day) &&
                  !isSelected(day) &&
                  'ring-1 ring-contrast'
              )}
            >
              {day}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// DatePicker Input Component
// ============================================================================

type DatePickerProps = {
  name: string
  placeholder?: string | undefined
  required?: boolean | undefined
  defaultValue?: string | undefined
  label?: string
  className?: string
  /** Disable navigating to months before the current month */
  disablePastMonths?: boolean | undefined
  /** Timezone for date calculations (e.g., "America/New_York"). Default: America/New_York */
  timezone?: string | undefined
}

export function DatePickerInput({
  name,
  placeholder = 'Select date',
  required,
  defaultValue,
  label = '',
  className = '',
  disablePastMonths = true,
  timezone = DEFAULT_TIMEZONE,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(
    defaultValue ? DateTime.fromISO(defaultValue, { zone: timezone }) : null
  )
  const [viewDate, setViewDate] = useState(
    selectedDate || DateTime.now().setZone(timezone)
  )
  const [viewDate2, setViewDate2] = useState(() => viewDate.plus({ months: 1 }))

  const handleSelect = (date: DateTime) => {
    setSelectedDate(date)
    setIsOpen(false)
  }

  // Sync second calendar to be month after first
  useEffect(() => {
    setViewDate2(viewDate.plus({ months: 1 }))
  }, [viewDate])

  return (
    <>
      <input
        type="hidden"
        name={name}
        value={formatDateValue(selectedDate)}
        data-label={label}
        required={required}
      />

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={clsx(triggerButtonStyles, className)}
      >
        <Icon
          icon={calendarIcon}
          className="w-5 h-5 text-contrast/70 shrink-0"
        />
        <span
          className={clsx(
            'flex-1 text-left',
            !selectedDate && 'text-contrast/50'
          )}
        >
          {selectedDate ? formatDate(selectedDate) : placeholder}
        </span>
        <Icon
          icon={chevronDownIcon}
          className="w-5 h-5 text-contrast/50 shrink-0"
        />
      </button>

      {/* Modal */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-overlay/30" />
        <div className="fixed inset-0 flex items-end lg:items-center justify-center p-0 lg:p-4">
          <DialogPanel className="w-full lg:w-auto bg-body rounded-t-2xl lg:rounded-2xl shadow-xl max-h-[90vh] overflow-auto">
            <div className="p-6 lg:p-8">
              {/* Calendars with headers */}
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
                {/* First calendar */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    {(() => {
                      const isCurrentMonth = isCurrentOrPastMonth(
                        viewDate.year,
                        viewDate.month - 1,
                        timezone
                      )
                      const disabled = disablePastMonths && isCurrentMonth

                      return (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            setViewDate(viewDate.minus({ months: 1 }))
                          }
                          className={clsx(
                            'p-2 rounded-full transition-colors',
                            disabled
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-contrast/5 cursor-pointer'
                          )}
                        >
                          <Icon
                            icon={chevronLeftIcon}
                            className="w-6 h-6 text-contrast"
                          />
                        </button>
                      )
                    })()}
                    <div className="flex gap-4 text-base font-semibold text-contrast">
                      <span>{MONTHS[viewDate.month - 1]}</span>
                      <span className="text-contrast/50">{viewDate.year}</span>
                    </div>
                    {/* Spacer on mobile, hidden on desktop */}
                    <button
                      type="button"
                      onClick={() => setViewDate(viewDate.plus({ months: 1 }))}
                      className="p-2 hover:bg-contrast/5 rounded-full transition-colors cursor-pointer lg:invisible"
                    >
                      <Icon
                        icon={chevronRightIcon}
                        className="w-6 h-6 text-contrast"
                      />
                    </button>
                  </div>
                  <Calendar
                    selectedDate={selectedDate}
                    onSelect={handleSelect}
                    viewDate={viewDate}
                    timezone={timezone}
                  />
                </div>

                {/* Second calendar (desktop only) */}
                <div className="hidden lg:block">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-2 invisible">
                      <Icon
                        icon={chevronLeftIcon}
                        className="w-6 h-6"
                      />
                    </div>
                    <div className="flex gap-4 text-base font-semibold text-contrast">
                      <span>{MONTHS[viewDate2.month - 1]}</span>
                      <span className="text-contrast/50">{viewDate2.year}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewDate(viewDate.plus({ months: 1 }))}
                      className="p-2 hover:bg-contrast/5 rounded-full transition-colors cursor-pointer"
                    >
                      <Icon
                        icon={chevronRightIcon}
                        className="w-6 h-6 text-contrast"
                      />
                    </button>
                  </div>
                  <Calendar
                    selectedDate={selectedDate}
                    onSelect={handleSelect}
                    viewDate={viewDate2}
                    timezone={timezone}
                  />
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
