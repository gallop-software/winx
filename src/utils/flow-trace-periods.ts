import { DateTime } from 'luxon'
import { flowTraceConfig } from '@/utils/flow-trace-config'
import { VIEW_PERIODS, type ViewPeriod } from '@/utils/page-view-types'

// The periods the FlowTrace box can show: the same as the page-view
// analytics, on the site's clock.

/** The period asked for in ?period=, or `fallback` when it is not one. */
export function periodOf(asked: unknown, fallback: ViewPeriod): ViewPeriod {
  return VIEW_PERIODS.find((period) => period === asked) ?? fallback
}

type Range = { from: number; to: number }

/**
 * The period as Unix seconds, `to` not included, and the same length of time
 * just before it to compare with (null for all time).
 */
export function periodRange(period: ViewPeriod): Range & {
  previous: Range | null
} {
  const today = DateTime.now().setZone(flowTraceConfig.zone).startOf('day')
  const tomorrow = today.plus({ days: 1 })
  const seconds = (date: DateTime) => Math.floor(date.toSeconds())
  const span = (from: DateTime, to: DateTime, back: DateTime) => ({
    from: seconds(from),
    to: seconds(to),
    previous: { from: seconds(back), to: seconds(from) },
  })
  switch (period) {
    case 'today':
      return span(today, tomorrow, today.minus({ days: 1 }))
    case 'yesterday':
      return span(today.minus({ days: 1 }), today, today.minus({ days: 2 }))
    case '7d':
    case '30d':
    case '90d': {
      const days = { '7d': 7, '30d': 30, '90d': 90 }[period]
      const from = today.minus({ days: days - 1 })
      return span(from, tomorrow, from.minus({ days }))
    }
    case '12m': {
      const from = today.startOf('month').minus({ months: 11 })
      return span(from, tomorrow, from.minus({ months: 12 }))
    }
    default:
      return { from: 0, to: seconds(tomorrow), previous: null }
  }
}
