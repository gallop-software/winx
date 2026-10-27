import type { NextRequest } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { verifyLink } from '@/utils/email-tracking'
import { recordOpen } from '@/utils/mailing'

export const dynamic = 'force-dynamic'

// A transparent GIF, one pixel square.
const PIXEL = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  (char) => char.charCodeAt(0)
)

// The picture at the end of a mailing. A mail program loading it is how the
// site knows the email was opened. It is a rough count: some programs load
// every picture before the reader looks, and some never load any.
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams
  const recipientId = await verifyLink('open', query.get('r'), query.get('s'))

  if (recipientId) {
    // The picture is sent at once; the count is written behind it.
    getCloudflareContext().ctx.waitUntil(
      recordOpen(recipientId).catch((error) => {
        console.error('An open was not recorded:', error)
      })
    )
  }

  return new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(PIXEL.byteLength),
      'Cache-Control': 'no-store, private',
    },
  })
}
