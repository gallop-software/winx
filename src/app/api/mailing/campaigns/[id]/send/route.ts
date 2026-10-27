import type { NextRequest } from 'next/server'
import { personalise } from '@/utils/email-tracking'
import {
  claimRecipients,
  getCampaign,
  getCampaignEmail,
  markFailed,
  markSent,
  releaseRecipients,
  requeue,
  setCampaignStatus,
} from '@/utils/mailing'
import { adminRoute, positiveInteger, problem, readInput, reply } from '@/utils/mailing-route'
import { getReplyToAddress, sendEmailMessage } from '@/utils/send-email'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// A few at a time, with a pause between them: the pace of send-mail.js,
// which keeps a mailing from looking like a burst to the inboxes receiving
// it. The screen asks for the next few as soon as these are done, so one
// request never runs long enough to be cut off.
const BATCH = 4
const PAUSE_MS = 500

// Cloudflare will take no more for now. Nothing is wrong with the campaign:
// it waits and is resumed.
const DAILY_LIMIT = 'E_DAILY_LIMIT_EXCEEDED'
const RATE_LIMIT = 'E_RATE_LIMIT_EXCEEDED'
const RATE_LIMIT_WAIT_SECONDS = 20

// The address itself was refused. Everyone else can still be sent to.
const RECIPIENT_PROBLEMS = new Set([
  'E_RECIPIENT_SUPPRESSED',
  'E_RECIPIENT_NOT_ALLOWED',
  'E_VALIDATION_ERROR',
  'E_DELIVERY_FAILED',
  'E_INTERNAL_SERVER_ERROR',
  'no_message_id',
  'unknown',
])

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Sends the next few emails of a campaign and says how far along it is, or
// pauses it, or puts failed ones back in the queue.
export async function POST(req: NextRequest, { params }: Params) {
  return adminRoute(req, async () => {
    const id = positiveInteger((await params).id)
    const input = await readInput(req)
    if (input instanceof Response) return input

    const campaign = id ? await getCampaign(id) : null
    const email = id ? await getCampaignEmail(id) : null
    if (!id || !campaign || !email) return problem('That campaign was not found.', 404)

    const answer = async (extra: Record<string, unknown> = {}) =>
      reply({ campaign: await getCampaign(id), ...extra })

    switch (input.action) {
      case 'pause':
        if (campaign.status === 'sending') {
          await setCampaignStatus(id, 'paused', 'Paused by you.')
        }
        return answer()
      case 'retry-failed':
      case 'retry-unconfirmed': {
        const count = await requeue(id, input.action === 'retry-failed' ? 'failed' : 'unconfirmed')
        if (count) await setCampaignStatus(id, 'paused', 'Ready to resume.')
        return answer({ requeued: count })
      }
      case 'send':
        break
      default:
        return problem('Unknown action')
    }

    const claimed = await claimRecipients(id, BATCH)
    if (!claimed.length) {
      // Nobody is waiting. Anyone still marked as being sent to was cut off
      // mid-send, and the campaign is not done until that is settled.
      const after = await getCampaign(id)
      const finished = !after?.totals.unconfirmed
      await setCampaignStatus(
        id,
        finished ? 'sent' : 'paused',
        finished ? '' : 'Some messages may or may not have gone out. See the Not sent filter.'
      )
      return answer({ done: true })
    }

    await setCampaignStatus(id, 'sending')

    const slug = email.postUrl.split('/').filter(Boolean).pop() ?? 'post'
    const replyTo = getReplyToAddress()

    for (const [index, recipient] of claimed.entries()) {
      const rest = () => claimed.slice(index).map((waiting) => waiting.id)

      const message = await personalise({ html: email.html, text: email.text, slug }, recipient.id)
      const sent = await sendEmailMessage({
        to: recipient.name
          ? { name: recipient.name, email: recipient.email }
          : recipient.email,
        subject: email.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
        ...(replyTo ? { replyTo } : {}),
      })

      if (sent.ok) {
        await markSent(recipient.id, sent.messageId)
      } else if (sent.code === RATE_LIMIT) {
        await releaseRecipients(rest())
        return answer({ retryAfter: RATE_LIMIT_WAIT_SECONDS })
      } else if (RECIPIENT_PROBLEMS.has(sent.code)) {
        await markFailed(recipient.id, `${sent.code} ${sent.reason}`.trim())
      } else {
        // The daily limit, or something about the setup that would fail for
        // everyone alike: stop here rather than fail the whole list.
        await releaseRecipients(rest())
        await setCampaignStatus(
          id,
          'paused',
          sent.code === DAILY_LIMIT
            ? 'Cloudflare’s daily sending limit was reached. Resume tomorrow to send the rest.'
            : `Sending stopped: ${sent.code} ${sent.reason}`.trim()
        )
        return answer({ paused: true })
      }

      if (index < claimed.length - 1) await wait(PAUSE_MS)
    }

    return answer()
  })
}
