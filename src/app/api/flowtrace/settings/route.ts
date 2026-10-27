import { DateTime } from 'luxon'
import type { NextRequest } from 'next/server'
import { getDb } from '@/utils/d1'
import { flowTraceConfig, flowTraceRecipients } from '@/utils/flow-trace-config'
import {
  isEmailMode,
  readEmailModes,
  saveEmailMode,
} from '@/utils/flow-trace-store'
import { adminRoute, problem, readInput, reply } from '@/utils/mailing-route'
import type { MemberSession } from '@/utils/member-session'
import { getMember } from '@/utils/members'

export const dynamic = 'force-dynamic'

// The administrator's own email address, from WordPress: it is never in the
// session cookie.
async function ownEmail(session: MemberSession): Promise<string | null> {
  const member = await getMember(session.id, session.version)
  return member.ok && member.value.email
    ? member.value.email.toLowerCase()
    : null
}

function team() {
  return flowTraceRecipients(process.env.FLOWTRACE_EMAILS, process.env.EMAIL_TO)
}

// Which FlowTrace emails the administrator gets, and everyone else's choice
// beside it: the box's Email settings. Only an address on FLOWTRACE_EMAILS
// (or EMAIL_TO) is emailed, and so only one of those may choose.
export async function GET(req: NextRequest) {
  return adminRoute(req, async (session) => {
    const list = team()
    const modes = await readEmailModes(getDb(), list)
    const email = await ownEmail(session)
    return reply({
      email,
      recipient: email !== null && list.includes(email),
      mode: (email && modes.get(email)) ?? flowTraceConfig.defaultEmailMode,
      team: list.map((address) => ({
        email: address,
        mode: modes.get(address) ?? flowTraceConfig.defaultEmailMode,
      })),
    })
  })
}

// Saves the administrator's own choice; nobody else's.
export async function POST(req: NextRequest) {
  return adminRoute(req, async (session) => {
    const input = await readInput(req, 512)
    if (input instanceof Response) return input
    if (!isEmailMode(input.mode)) return problem('Choose one of the options.')
    const email = await ownEmail(session)
    if (!email || !team().includes(email)) {
      return problem(
        'FlowTrace does not email your address. Add it to FLOWTRACE_EMAILS first.',
        403
      )
    }
    await saveEmailMode(
      getDb(),
      email,
      input.mode,
      Math.floor(DateTime.now().toSeconds())
    )
    return reply({ mode: input.mode })
  })
}
