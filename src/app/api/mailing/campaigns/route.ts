import type { NextRequest } from 'next/server'
import { composePostEmail } from '@/utils/email-compose'
import { createCampaign, getCampaign, listCampaigns, type Audience } from '@/utils/mailing'
import { adminRoute, positiveInteger, problem, readInput, reply } from '@/utils/mailing-route'

export const dynamic = 'force-dynamic'

// The subscribers an administrator ticked, at most.
const MAX_TICKED = 100000
const MAX_BODY_BYTES = 2 * 1024 * 1024

// The campaigns already made for a post, newest first, with their totals.
export async function GET(req: NextRequest) {
  return adminRoute(req, async () => {
    const postId = positiveInteger(req.nextUrl.searchParams.get('postId'))
    if (!postId) return problem('Unknown post')
    return reply({ campaigns: await listCampaigns(postId) })
  })
}

function audienceOf(value: unknown): Audience | null {
  if (value === 'all') return { kind: 'all' }
  if (!Array.isArray(value) || !value.length || value.length > MAX_TICKED) return null
  const ids = value.map(positiveInteger)
  return ids.every((id): id is number => id !== null) ? { kind: 'ids', ids } : null
}

// Makes a campaign: the email as it stands now, and who it goes to, copied
// from the mailing list. Nothing is sent until the screen asks, one small
// batch at a time, through campaigns/[id]/send.
export async function POST(req: NextRequest) {
  return adminRoute(req, async (session) => {
    const input = await readInput(req, MAX_BODY_BYTES)
    if (input instanceof Response) return input

    const audience = audienceOf(input.audience)
    if (!audience) return problem('Choose who the email goes to.')

    const email = await composePostEmail(String(input.path ?? ''), input)
    if (!email) return problem('That post was not found.', 404)

    const created = await createCampaign({ ...email, createdBy: session.id, audience })
    if (!created.queued) {
      return problem('Nobody chosen is subscribed, so there is no one to send it to.')
    }
    return reply({ ...created, campaign: await getCampaign(created.id) }, 201)
  })
}
