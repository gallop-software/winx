import type { NextRequest } from 'next/server'
import { adminRoute, reply } from '@/utils/mailing-route'
import { VIEW_PERIODS } from '@/utils/page-view-types'
import { readPageViews } from '@/utils/page-views'

export const dynamic = 'force-dynamic'

// The site's page views, or one page's with `path`: the chart, the numbers
// above it and the lists below it. An administrator's alone.
export async function GET(req: NextRequest) {
  return adminRoute(req, async () => {
    const query = req.nextUrl.searchParams
    const report = await readPageViews({
      period:
        VIEW_PERIODS.find((period) => period === query.get('period')) ?? '30d',
      bucket: (query.get('bucket') ?? '').slice(0, 13),
      path: (query.get('path') ?? '').slice(0, 600),
    })
    return reply(report)
  })
}
