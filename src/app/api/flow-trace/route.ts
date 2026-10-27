import { NextResponse, type NextRequest } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { DateTime } from 'luxon'
import { isSameOrigin, visitorIp } from '@/utils/comment-guard'
import { reportConversion } from '@/utils/flow-trace-jobs'
import { flowTraceContext } from '@/utils/flow-trace-mail'
import { parsePayload, recordConversion } from '@/utils/flow-trace-store'
import { allowAttempt, hashAddress } from '@/utils/member-guard'
import { readSession } from '@/utils/member-session'
import { isBot, parseUserAgent } from '@/utils/page-views'
import { readJsonObject } from '@/utils/read-body'

export const dynamic = 'force-dynamic'

// A whole visit of up to 100 steps.
const MAX_BYTES = 64 * 1024

// What Cloudflare knows of where the request came from. Not there in local
// development.
type Place = {
  country?: unknown
  region?: unknown
  regionCode?: unknown
  city?: unknown
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

function nothing(status = 204) {
  return new NextResponse(null, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

// Records a visit that has just converted, sent whole by
// src/hooks/flow-trace.tsx, and emails its report. It answers at once and
// works behind the visitor: tracing never makes anyone wait. Ordinary views
// never come here; Analytics counts those (/api/view).
//
// Public, so: a page of this site only, a size limit, no bots, no
// administrator's own visits, and at most 30 visits an hour stored from one
// address. The report emails have their own hourly limits. The place is
// Cloudflare's; nothing is sent to any other service.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return nothing(403)

  // Sent as text/plain, which a beacon may send without a preflight.
  const input = await readJsonObject(req, MAX_BYTES)
  if (input === 'too_large') return nothing(413)
  const visit = input && parsePayload(input)
  if (!visit) return nothing(400)

  const userAgent = req.headers.get('user-agent') ?? ''
  if (isBot(userAgent)) return nothing()

  // The administrators' own visits are not what FlowTrace is for. The cookie
  // is enough to tell: nothing here is worth asking WordPress about.
  const session = await readSession(req)
  if (session?.isAdmin) return nothing()

  const ip = visitorIp(req)
  const allowed = await allowAttempt({
    kind: 'flowtrace',
    ipHash: await hashAddress(ip),
  })
  if (!allowed.ok) return nothing(429)

  const context = getCloudflareContext()
  const place = (context.cf ?? {}) as Place
  const now = DateTime.now()
  const jobs = flowTraceContext()

  context.ctx.waitUntil(
    (async () => {
      await recordConversion(jobs.db, visit, {
        siteHost: req.headers.get('host') ?? '',
        ip,
        country: text(place.country) || (req.headers.get('cf-ipcountry') ?? ''),
        region: text(place.regionCode) || text(place.region),
        city: text(place.city),
        ...parseUserAgent(userAgent),
        now: Math.floor(now.toSeconds()),
      })
      await reportConversion(jobs, visit.s, now)
    })().catch((error) => console.error('FlowTrace visit not recorded:', error))
  )

  return nothing()
}
