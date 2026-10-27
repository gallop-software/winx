// The Worker's entry point. Requests go to the site through the worker
// OpenNext builds, with a page cache in front of it. What this file also adds:
// - the queue handler: Cloudflare Email Sending puts what became of each
//   message (delivered, bounced, marked as spam) on the `winx-email-events`
//   queue, and those are written to the marketing email tables so the
//   campaign reports show them;
// - the scheduled handler, on the cron in wrangler.jsonc: FlowTrace's report
//   emails that failed to go out are sent again, and its daily and weekly
//   summaries go out (src/utils/flow-trace-jobs.ts).
//
// wrangler.jsonc points `main` here. `.open-next/worker.js` only exists after
// `npm run cf:build`.

// @ts-ignore: generated at build time
import handler from './.open-next/worker.js'
import { recordEmailEvent, type EmailEvent } from './src/utils/email-events'
import { flowTraceRecipients } from './src/utils/flow-trace-config'
import { runFlowTraceJobs } from './src/utils/flow-trace-jobs'
import { cachedPage, type PageCacheKv } from './src/utils/page-cache'
import type { D1 } from './src/utils/d1'

type Message = { body: unknown; ack(): void; retry(): void }
type Batch = { queue: string; messages: Message[] }
type Address = string | { name: string; email: string }
type Mailer = {
  send(message: {
    from: Address
    to: Address
    subject: string
    html: string
    text: string
  }): Promise<{ messageId: string }>
}
type Env = {
  DB?: D1
  POST_CACHE?: PageCacheKv
  SITE_HOST?: string
  EMAIL?: Mailer
  EMAIL_FROM?: string
  EMAIL_FROM_NAME?: string
  EMAIL_TO?: string
  FLOWTRACE_EMAILS?: string
  NEXT_PUBLIC_PRODUCTION_URL?: string
}
type Context = { waitUntil(promise: Promise<unknown>): void }

// The site has one address, SITE_HOST in wrangler.jsonc. A request for any
// other host the Worker is attached to (www, the old dev host), or over
// plain http, is sent there for good, path and query kept. This runs ahead
// of the page cache, so a page is only ever cached under its one address.
function elsewhere(request: Request, env: Env): Response | null {
  const host = env.SITE_HOST
  if (!host) return null
  const url = new URL(request.url)
  if (url.hostname === host && url.protocol === 'https:') return null
  // Previewing the built Worker on this machine (npm run cf:preview) stays
  // here rather than going to the live site.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return null
  return Response.redirect(`https://${host}${url.pathname}${url.search}`, 301)
}

const worker = {
  // A page is built once and kept, as src/utils/page-cache.ts says; anything
  // that is not a page goes to the site as before.
  fetch: (request: Request, env: Env, ctx: Context) =>
    elsewhere(request, env) ??
    cachedPage(request, env, ctx, () => handler.fetch(request, env, ctx)),

  // Each message is settled on its own: one that cannot be written is tried
  // again without the rest being recorded twice. An event about a message
  // that is not a campaign's, such as the contact form's, is simply dropped.
  async queue(batch: Batch, env: Env) {
    for (const message of batch.messages) {
      if (!env.DB) {
        message.retry()
        continue
      }
      try {
        await recordEmailEvent(env.DB, message.body as EmailEvent)
        message.ack()
      } catch (error) {
        console.error('An email event was not recorded:', error)
        message.retry()
      }
    }
  },

  // Every ten minutes. Each run is short: at most a few retried reports, and
  // a summary only once a day.
  scheduled(_controller: unknown, env: Env, ctx: Context) {
    const { DB: db, EMAIL: mailer, EMAIL_FROM: from } = env
    if (!db || !mailer || !from) {
      console.error(
        'FlowTrace jobs need the DB and EMAIL bindings and EMAIL_FROM'
      )
      return
    }
    const name = env.EMAIL_FROM_NAME || env.SITE_HOST || 'the site'
    ctx.waitUntil(
      runFlowTraceJobs({
        db,
        recipients: flowTraceRecipients(env.FLOWTRACE_EMAILS, env.EMAIL_TO),
        site: {
          url:
            env.NEXT_PUBLIC_PRODUCTION_URL || `https://${env.SITE_HOST ?? ''}`,
          name,
        },
        send: async (to, email) => {
          try {
            const { messageId } = await mailer.send({
              from: { name: `FlowTrace · ${name}`, email: from },
              to,
              ...email,
            })
            return {
              ok: Boolean(messageId),
              ...(messageId ? {} : { code: 'no_message_id' }),
            }
          } catch (error) {
            const { code } = error as { code?: string }
            console.error('FlowTrace email not sent:', code)
            return { ok: false, code: code ?? 'unknown' }
          }
        },
      }).catch((error) => console.error('FlowTrace jobs failed:', error))
    )
  },
}

export default worker

// The Durable Objects OpenNext's worker declares, passed on unchanged.
// prettier-ignore
// @ts-ignore: generated at build time
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js'
