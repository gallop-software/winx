import type { NextRequest } from 'next/server'
import { addressOf, answer, fieldOf, limit, readForm, refuse } from '@/utils/account-route'
import { readConfirmation } from '@/utils/newsletter'
import { confirmSubscription } from '@/utils/subscribers'

export const dynamic = 'force-dynamic'

// The confirmation link was opened and its button pressed: the address goes
// on the mailing list.
export async function POST(req: NextRequest) {
  const input = await readForm(req)
  if (input instanceof Response) return input

  const ip = addressOf(req)
  if (ip instanceof Response) return ip

  const refused = await limit('confirm', ip)
  if (refused) return refused

  const link = await readConfirmation({
    i: fieldOf(input, 'i'),
    e: fieldOf(input, 'e'),
    t: fieldOf(input, 't'),
    s: fieldOf(input, 's'),
  })
  if (!link || link === 'expired') return refuse('link_invalid', 400)

  // The row may have been deleted since, or its address changed.
  if (!(await confirmSubscription(link.id, link.email))) return refuse('link_invalid', 400)

  return answer({ subscribed: true })
}
