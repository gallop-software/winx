import type { NextRequest } from 'next/server'
import { getDb } from '@/utils/d1'
import { renderVisitEmail } from '@/utils/flow-trace-email'
import { flowTraceContext } from '@/utils/flow-trace-mail'
import { latestVisitId, readVisitReport } from '@/utils/flow-trace-store'
import { adminRoute, reply } from '@/utils/mailing-route'
import { getMember } from '@/utils/members'

export const dynamic = 'force-dynamic'

// Emails the administrator the report on the latest converted visit, as a
// test, to their own address and nobody else's. Nothing is written down.
export async function POST(req: NextRequest) {
  return adminRoute(req, async (session) => {
    const member = await getMember(session.id, session.version)
    if (!member.ok || !member.value.email) return reply({ result: 'failed' })
    const db = getDb()
    const id = await latestVisitId(db)
    const report = id ? await readVisitReport(db, id) : null
    if (!report) return reply({ result: 'none' })
    const context = flowTraceContext()
    const email = renderVisitEmail(report, context.site)
    const sent = await context.send(member.value.email, {
      ...email,
      subject: `[Test] ${email.subject}`,
    })
    return reply({ result: sent.ok ? 'sent' : 'failed' })
  })
}
