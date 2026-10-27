import { NextResponse, type NextRequest } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { isSameOrigin, visitorIp } from '@/utils/comment-guard'
import { readSession } from '@/utils/member-session'
import { isBot, recordPageView } from '@/utils/page-views'
import { readJsonObject } from '@/utils/read-body'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 2048

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

// What Cloudflare knows of where the request came from. Not there in local
// development.
type Place = { country?: unknown; region?: unknown; city?: unknown }

// Counts a page view. Sent by src/hooks/page-view.tsx from every page. It
// answers at once and counts behind the visitor: a view never makes anyone
// wait, and one that cannot be counted is dropped.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return new NextResponse(null, { status: 403 })

  const input = await readJsonObject(req, MAX_BYTES)
  if (input === 'too_large') return new NextResponse(null, { status: 413 })
  if (input === null) return new NextResponse(null, { status: 400 })

  const counted = new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  })

  const userAgent = req.headers.get('user-agent') ?? ''
  if (isBot(userAgent)) return counted

  // An administrator's own reading is not what the numbers are for. The
  // cookie is enough to tell: nothing here is worth asking WordPress about.
  const session = await readSession(req)
  if (session?.isAdmin) return counted

  const context = getCloudflareContext()
  const place = (context.cf ?? {}) as Place

  context.ctx.waitUntil(
    recordPageView({
      path: text(input.path),
      entry: input.entry === true,
      referrer: text(input.referrer),
      utmSource: text(input.utmSource),
      utmMedium: text(input.utmMedium),
      utmCampaign: text(input.utmCampaign),
      siteHost: req.headers.get('host') ?? '',
      country: text(place.country) || (req.headers.get('cf-ipcountry') ?? ''),
      region: text(place.region),
      city: text(place.city),
      userAgent,
      ip: visitorIp(req),
    }).catch((error) => {
      console.error('Page view not counted:', error)
    })
  )

  return counted
}
