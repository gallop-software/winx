import { NextResponse, type NextRequest } from 'next/server'
import { baseURL } from '@/app/metadata'
import { verifyLink } from '@/utils/email-tracking'
import { recordUnsubscribe } from '@/utils/mailing'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

// The link came from an inbox, so opening it only shows the page that asks.
// A mail scanner that follows every link in a message changes nothing.
export async function GET(req: NextRequest) {
  return NextResponse.redirect(`${baseURL}/account/unsubscribe/${req.nextUrl.search}`, 302)
}

// Unsubscribes the person a signed link was made for. Posted by the button
// on the unsubscribe page, and by a mail program's own "Unsubscribe" button
// (RFC 8058), which is why it does not ask where the request came from: the
// signature is what says it is theirs.
//
// They come off the mailing list, which is the site's own: WordPress and
// their account, if they have one, are not involved.
export async function POST(req: NextRequest) {
  const query = req.nextUrl.searchParams
  const recipientId = await verifyLink('unsubscribe', query.get('r'), query.get('s'))
  if (!recipientId) {
    return NextResponse.json(
      { ok: false, message: 'This link is not valid.' },
      { status: 400, headers: NO_STORE }
    )
  }

  await recordUnsubscribe(recipientId)

  return NextResponse.json({ ok: true }, { headers: NO_STORE })
}
