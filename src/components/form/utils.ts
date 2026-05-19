import { DateTime } from 'luxon'

// ============================================================================
// Form Utilities & Constants
// ============================================================================

// Default timezone (can be overridden by component props)
export const DEFAULT_TIMEZONE = 'America/New_York'

// Get current date/time in a specific timezone
export function getNow(timezone: string = DEFAULT_TIMEZONE) {
  return DateTime.now().setZone(timezone)
}

// Get today's date (start of day) in a specific timezone
export function getToday(timezone: string = DEFAULT_TIMEZONE) {
  return getNow(timezone).startOf('day')
}

// Check if a date is in the past (compared to timezone's today)
export function isDatePast(
  year: number,
  month: number,
  day: number,
  timezone: string = DEFAULT_TIMEZONE
) {
  const date = DateTime.fromObject(
    { year, month: month + 1, day },
    { zone: timezone }
  ).startOf('day')
  const today = getToday(timezone)
  return date < today
}

// Check if a date is today in a specific timezone
export function isDateToday(
  year: number,
  month: number,
  day: number,
  timezone: string = DEFAULT_TIMEZONE
) {
  const date = DateTime.fromObject(
    { year, month: month + 1, day },
    { zone: timezone }
  ).startOf('day')
  const today = getToday(timezone)
  return date.equals(today)
}

// Check if a month is current or past (for disabling navigation)
export function isCurrentOrPastMonth(
  year: number,
  month: number,
  timezone: string = DEFAULT_TIMEZONE
) {
  const now = getNow(timezone)
  return year < now.year || (year === now.year && month <= now.month - 1)
}

// Calendar constants
export const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// ============================================================================
// Date Utilities
// ============================================================================

export function getDaysInMonth(year: number, month: number) {
  // month is 0-indexed, Luxon uses 1-indexed
  return DateTime.fromObject({ year, month: month + 1 }).daysInMonth ?? 31
}

export function getFirstDayOfMonth(year: number, month: number) {
  // Luxon weekday: 1=Monday, 7=Sunday; convert to JS: 0=Sunday, 6=Saturday
  const dt = DateTime.fromObject({ year, month: month + 1, day: 1 })
  return dt.weekday === 7 ? 0 : dt.weekday
}

export function formatDate(dt: DateTime | null) {
  if (!dt || !dt.isValid) return ''
  return dt.toFormat('ccc, MMM d')
}

export function formatDateValue(dt: DateTime | null) {
  if (!dt || !dt.isValid) return ''
  return dt.toFormat('yyyy-MM-dd')
}

// ============================================================================
// Time Utilities
// ============================================================================

export function formatTime(hour: number, minute: number) {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  const displayMinute = String(minute).padStart(2, '0')
  return `${displayHour}:${displayMinute} ${period}`
}

export function formatTimeValue(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// Generate time slots in 5-minute increments (filtered by interval prop)
export type TimeSlot = {
  hour: number
  minute: number
  label: string
  value: string
}

function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const period = h >= 12 ? 'PM' : 'AM'
      const displayHour = h % 12 || 12
      const displayMinute = String(m).padStart(2, '0')
      slots.push({
        hour: h,
        minute: m,
        label: `${displayHour}:${displayMinute} ${period}`,
        value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      })
    }
  }
  return slots
}

export const TIME_SLOTS = generateTimeSlots()

// ============================================================================
// Shared Input Styles
// ============================================================================

export const inputBaseStyles = `
  w-full rounded-md bg-body2 px-3 py-2 text-xs text-contrast font-medium
  border border-contrast/40 outline-none transition
  placeholder:text-contrast/50
  focus:border-contrast focus:ring-0
`

export const triggerButtonStyles = `
  w-full flex items-center gap-3 rounded-md bg-body2 px-4 py-3 text-contrast font-medium
  border-2 border-contrast/40 outline-none transition
  hover:border-contrast/60
  focus:border-contrast focus:ring-0 cursor-pointer
`
