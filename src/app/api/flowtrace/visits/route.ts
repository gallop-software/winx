import type { NextRequest } from 'next/server'
import { getDb } from '@/utils/d1'
import { periodOf, periodRange } from '@/utils/flow-trace-periods'
import { listVisits } from '@/utils/flow-trace-store'
import { adminRoute, positiveInteger, reply } from '@/utils/mailing-route'

export const dynamic = 'force-dynamic'

// One page of converted visits, newest first, for a period, an address or a
// search: the box's Converted visits. It carries visitors' IP addresses, so
// it is an administrator's alone.
export async function GET(req: NextRequest) {
  return adminRoute(req, async () => {
    const query = req.nextUrl.searchParams
    const range = periodRange(periodOf(query.get('period'), 'all'))
    const visits = await listVisits(getDb(), {
      page: Math.min(100000, positiveInteger(query.get('page') ?? '1') ?? 1),
      from: range.from,
      to: range.to,
      ip: (query.get('ip') ?? '').slice(0, 45),
      search: (query.get('search') ?? '').slice(0, 100),
    })
    return reply(visits)
  })
}
