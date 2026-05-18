'use client'

import { useState, useEffect } from 'react'
import { DateTime } from 'luxon'

const TIMEZONE = 'America/Chicago'

export function CurrentDate({ dayString }: { dayString: string }) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null)

  useEffect(() => {
    // Function to calculate the correct occurrence of the specified day
    const calculateNextDayDate = (): string => {
      const daysOfWeek = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]

      const now = DateTime.now().setZone(TIMEZONE)
      // Luxon weekday: 1=Monday, 7=Sunday; our array is 0=Monday, 6=Sunday
      const currentDayIndex = now.weekday - 1
      const targetDayIndex = daysOfWeek.indexOf(dayString.toLowerCase())

      if (targetDayIndex === -1) {
        throw new Error('Invalid day string')
      }

      // Calculate the number of days difference
      const daysUntilTarget = targetDayIndex - currentDayIndex

      // Calculate the target date
      const targetDate = now.plus({ days: daysUntilTarget })
      return `${targetDate.month}/${targetDate.day}`
    }

    // Calculate and set the formatted date
    const updateFormattedDate = () => {
      const date = calculateNextDayDate()
      setFormattedDate(date)
    }

    // Initial call to set the formatted date
    updateFormattedDate()

    // Set interval to recalculate the date every 60 seconds (adjust as needed)
    const intervalId = setInterval(updateFormattedDate, 60000)

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId)
  }, [dayString])

  if (!formattedDate) {
    return null // Avoid rendering until the date is calculated
  }

  return <>({formattedDate})</>
}
