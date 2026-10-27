import type { NextRequest } from 'next/server'
import { composePostEmail } from '@/utils/email-compose'
import { unpersonalised } from '@/utils/email-tracking'
import { adminRoute, problem, readInput, reply } from '@/utils/mailing-route'
import { getMember } from '@/utils/members'
import { getReplyToAddress, sendEmailMessage } from '@/utils/send-email'

export const dynamic = 'force-dynamic'

// Sends the email to the administrator who asked, and to nobody else, so
// it can be seen in a real inbox first. Nothing is recorded, and its links
// are not counted.
export async function POST(req: NextRequest) {
  return adminRoute(req, async (session) => {
    const input = await readInput(req)
    if (input instanceof Response) return input

    const email = await composePostEmail(String(input.path ?? ''), input)
    if (!email) return problem('That post was not found.', 404)

    const member = await getMember(session.id, session.version)
    if (!member.ok || !member.value.email) {
      return problem('WordPress did not say what your email address is.', 502)
    }

    const { html, text } = unpersonalised(email)
    const replyTo = getReplyToAddress()
    const sent = await sendEmailMessage({
      to: { name: member.value.displayName, email: member.value.email },
      subject: `[Test] ${email.subject}`,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    })
    if (!sent.ok) {
      return problem(`The test was not sent (${sent.code}). ${sent.reason}`.trim(), 502)
    }

    return reply({ sentTo: member.value.email })
  })
}
