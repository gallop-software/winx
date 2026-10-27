import type { NextRequest } from 'next/server'
import { getDb } from '@/utils/d1'
import { periodOf, periodRange } from '@/utils/flow-trace-periods'
import { readCounts, readSummary } from '@/utils/flow-trace-store'
import { adminRoute, reply } from '@/utils/mailing-route'
import { readSiteVisits } from '@/utils/page-views'

export const dynamic = 'force-dynamic'

// FlowTrace's numbers for a period and the period before: the box's
// Overview. The site's visits in the same time come from Analytics' own
// counts, so the conversion rate is measured against the visits Analytics
// shows. An administrator's alone.
export async function GET(req: NextRequest) {
  return adminRoute(req, async () => {
    const period = periodOf(req.nextUrl.searchParams.get('period'), '30d')
    const range = periodRange(period)
    const db = getDb()
    const [summary, before, visits, visitsBefore] = await Promise.all([
      readSummary(db, range.from, range.to),
      range.previous
        ? readCounts(db, range.previous.from, range.previous.to)
        : null,
      readSiteVisits(range.from, range.to),
      range.previous
        ? readSiteVisits(range.previous.from, range.previous.to)
        : null,
    ])
    return reply({
      period,
      summary: { ...summary, visits },
      before: before ? { ...before, visits: visitsBefore } : null,
    })
  })
}
