import 'server-only'
import { baseURL } from '@/app/metadata'
import { getDb } from '@/utils/d1'
import { SITE_NAME } from '@/utils/email-template'
import { flowTraceRecipients } from '@/utils/flow-trace-config'
import type { FtJobContext } from '@/utils/flow-trace-jobs'
import { sendEmailMessage } from '@/utils/send-email'

// What FlowTrace's jobs need, inside a request: the database, the site's
// mailer under the name "FlowTrace · Founder Notes", who is emailed and
// where the links point. worker.ts builds the same from the Worker's own
// environment for the scheduled job.
export function flowTraceContext(): FtJobContext {
  return {
    db: getDb(),
    recipients: flowTraceRecipients(
      process.env.FLOWTRACE_EMAILS,
      process.env.EMAIL_TO
    ),
    site: { url: baseURL, name: SITE_NAME },
    send: async (to, email) => {
      const sent = await sendEmailMessage({
        // The same name the scheduled job's emails go out under (worker.ts).
        fromName: `FlowTrace · ${process.env.EMAIL_FROM_NAME || SITE_NAME}`,
        to,
        ...email,
      })
      return sent.ok ? { ok: true } : { ok: false, code: sent.code }
    },
  }
}
