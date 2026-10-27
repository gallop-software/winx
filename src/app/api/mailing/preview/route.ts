import type { NextRequest } from 'next/server'
import { composePostEmail } from '@/utils/email-compose'
import { unpersonalised } from '@/utils/email-tracking'
import { adminRoute, problem, readInput, reply } from '@/utils/mailing-route'

export const dynamic = 'force-dynamic'

// The email a post would be sent as, to look at before sending.
export async function POST(req: NextRequest) {
  return adminRoute(req, async () => {
    const input = await readInput(req)
    if (input instanceof Response) return input

    const email = await composePostEmail(String(input.path ?? ''), input)
    if (!email) return problem('That post was not found.', 404)

    return reply({
      postId: email.postId,
      subject: email.subject,
      preheader: email.preheader,
      html: unpersonalised(email).html,
    })
  })
}
