import type { NextRequest } from 'next/server'
import { adminRoute, positiveInteger, reply } from '@/utils/mailing-route'
import { readVisitLog } from '@/utils/page-views'

export const dynamic = 'force-dynamic'

// One page of the visit log, newest first. It carries visitors' IP addresses,
// which are returned here and nowhere else.
export async function GET(req: NextRequest) {
  return adminRoute(req, async () => {
    const query = req.nextUrl.searchParams
    const visits = await readVisitLog({
      page: positiveInteger(query.get('page') ?? '1') ?? 1,
      ip: (query.get('ip') ?? '').slice(0, 45),
      path: (query.get('path') ?? '').slice(0, 600),
      search: (query.get('search') ?? '').slice(0, 100),
    })
    return reply(visits)
  })
}
