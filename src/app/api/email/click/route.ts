import { NextResponse, type NextRequest } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { baseURL } from '@/app/metadata'
import { clickDestination, verifyLink } from '@/utils/email-tracking'
import { recordClick } from '@/utils/mailing'

export const dynamic = 'force-dynamic'

// Where every link in a mailing goes first, so the click is counted, before
// the reader is sent on. The signature covers the destination: only a link
// that was in the email is ever followed, and anything else goes home.
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams
  const url = clickDestination(query)
  const recipientId = /^https?:\/\//.test(url)
    ? await verifyLink('click', query.get('r'), query.get('s'), url)
    : null

  if (!recipientId) return NextResponse.redirect(`${baseURL}/`, 302)

  getCloudflareContext().ctx.waitUntil(
    recordClick(recipientId, url).catch((error) => {
      console.error('A click was not recorded:', error)
    })
  )

  return new NextResponse(null, {
    status: 302,
    headers: { Location: url, 'Cache-Control': 'no-store, private' },
  })
}
