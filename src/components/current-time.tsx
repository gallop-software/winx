'use client'

import { useState, useEffect } from 'react'
import { DateTime } from 'luxon'

function getDayId(dayName: string): number | undefined {
  const days = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  }

  if (!dayName) return undefined

  const normalized =
    dayName.trim().charAt(0).toUpperCase() +
    dayName.trim().slice(1).toLowerCase()

  return days[normalized as keyof typeof days]
}

export function CurrentTime({
  dayOfWeek,
  timeRange,
  openColor = 'text-accent',
  closedColor = 'text-red-700',
}: {
  dayOfWeek: string
  timeRange: string
  openColor?: string
  closedColor?: string
}) {
  const [currentTime, setCurrentTime] = useState<any>(null)
  const zone = 'America/Chicago'

  useEffect(() => {
    setCurrentTime(DateTime.now().setZone(zone))
    const intervalId = setInterval(() => {
      setCurrentTime(DateTime.now().setZone(zone))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  if (!currentTime) {
    return null
  }

  const parseTime = (timeString: string) => {
    const isAM = timeString.includes('am') ? true : false
    let hour12 = Number(
      timeString.includes(':') ? timeString : timeString.replace(/(am|pm)/, '')
    )

    hour12 += isAM ? 0 : 12
    const year = currentTime.year
    const month = currentTime.month
    const day = currentTime.day

    const parsedDate = DateTime.fromObject(
      { year, month, day, hour: hour12, minute: 0, second: 0 },
      { zone }
    )

    return parsedDate
  }
  const nowDay = currentTime.weekday % 7

  if (getDayId(dayOfWeek) !== nowDay) {
    return null
  }

  let isWithinLimits = false

  if (timeRange && timeRange.includes('-')) {
    const [lowerLimit, upperLimit] = timeRange.split('-')
    if (lowerLimit && upperLimit) {
      const lowerTime = parseTime(lowerLimit.trim())
      const upperTime = parseTime(upperLimit.trim())

      if (lowerTime && upperTime) {
        isWithinLimits = currentTime >= lowerTime && currentTime <= upperTime
      }
    }
  }

  const formattedTime = currentTime.toFormat('h:mm:ss a')

  return (
    <div
      className={`${isWithinLimits ? openColor : closedColor} font-bold flex justify-between w-full`}
    >
      <span>{isWithinLimits ? 'Open' : 'Closed'}</span>
      {formattedTime}
    </div>
  )
}
