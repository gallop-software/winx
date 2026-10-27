import type { NextRequest } from 'next/server'
import { getDb } from '@/utils/d1'
import { readVisitReport } from '@/utils/flow-trace-store'
import { adminRoute, problem, reply } from '@/utils/mailing-route'

export const dynamic = 'force-dynamic'

// One visit's report, with how its report email went: what every FlowTrace
// email links to. An administrator's alone.
export async function GET(req: NextRequest) {
  return adminRoute(req, async () => {
    const id = (req.nextUrl.searchParams.get('id') ?? '').slice(0, 64)
    const report = await readVisitReport(getDb(), id)
    if (!report) return problem('This visit is no longer available.', 404)
    return reply(report)
  })
}
