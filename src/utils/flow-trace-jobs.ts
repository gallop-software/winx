import { DateTime } from 'luxon'
import { flowTraceConfig } from '@/utils/flow-trace-config'
import {
  renderDigestEmail,
  renderVisitEmail,
  type FtEmail,
  type FtSite,
} from '@/utils/flow-trace-email'
import {
  claimDigest,
  countReports,
  expireUnsent,
  markReported,
  readEmailModes,
  readSummary,
  readUnsent,
  readVisitReport,
  recordReportSend,
  releaseDigest,
} from '@/utils/flow-trace-store'
import type { FtEmailMode } from '@/utils/flow-trace-types'
import type { D1 } from '@/utils/d1'

// FlowTrace's emails. Each conversion is reported the moment it happens, by
// reportConversion, called from /api/flow-trace. The scheduled work, run
// every ten minutes by worker.ts:
//  1. sending again any report that failed to go out, for retryHours, and
//     then giving up on it (it shows as failed in FlowTrace);
//  2. the daily and weekly summaries, once each, at the digest hour.
// Everyone emailed is on FLOWTRACE_EMAILS (or EMAIL_TO); their choice is in
// ft_email_settings, and the default in src/utils/flow-trace-config.ts.
// No server-only import: worker.ts bundles this outside Next.js, and hands
// in the database, the mailer, the list and the site.

// Sends one email to one address. `code` is why it did not go, when it did
// not: Cloudflare's, such as E_DAILY_LIMIT_EXCEEDED.
export type FtSend = (
  to: string,
  email: FtEmail
) => Promise<{ ok: boolean; code?: string }>

export type FtJobContext = {
  db: D1
  send: FtSend
  // Who may be emailed: flowTraceRecipients() in flow-trace-config.ts.
  recipients: string[]
  site: FtSite
}

async function recipientsFor(
  context: FtJobContext,
  mode: FtEmailMode
): Promise<string[]> {
  const modes = await readEmailModes(context.db, context.recipients)
  return [...modes]
    .filter(([, chosen]) => chosen === mode)
    .map(([email]) => email)
}

/**
 * Reports a visit that has just converted, to each "instant" person, writes
 * down how each send went, and settles the visit. Called from
 * /api/flow-trace once the visit is written. True when it went out to
 * someone; a visit nobody could be sent stays waiting for the scheduled job.
 */
export async function reportConversion(
  context: FtJobContext,
  visitId: string,
  now: DateTime
): Promise<boolean> {
  const { db } = context
  const stamp = Math.floor(now.toSeconds())
  const to = await recipientsFor(context, 'instant')
  // With no one to tell, the visit is settled all the same: turning instant
  // reports on later should not send a backlog.
  if (!to.length) {
    await markReported(db, visitId, stamp, 'nobody')
    return false
  }
  const report = await readVisitReport(db, visitId)
  if (!report) return false

  // Past the hourly limits the visit is kept and settled, but not emailed:
  // it is in FlowTrace and the summaries.
  const sent = await countReports(db, stamp - 3600, report.visit.ip)
  if (
    sent.all >= flowTraceConfig.reportsPerHour ||
    sent.fromAddress >= flowTraceConfig.reportsPerAddressPerHour
  ) {
    await markReported(db, visitId, stamp, 'capped')
    return false
  }

  const email = renderVisitEmail(report, context.site)
  // On a retry, only those it did not reach yet: nobody gets it twice.
  const reached = new Set(
    report.sends.filter((send) => send.ok).map((send) => send.email)
  )
  const pending = to.filter((address) => !reached.has(address))
  // One at a time: a mailer limit reached on one is not hit again at once.
  let any = reached.size > 0
  let all = true
  for (const address of pending) {
    const result = await context
      .send(address, email)
      .catch(() => ({ ok: false, code: 'unknown' }))
    await recordReportSend(db, visitId, {
      email: address,
      at: stamp,
      ok: result.ok,
      error: result.ok ? '' : (result.code ?? 'unknown'),
    })
    if (result.ok) any = true
    else all = false
  }
  // Someone not reached yet keeps the visit waiting, so the scheduled job
  // tries them again; it is settled once everyone has it.
  if (all) await markReported(db, visitId, stamp, 'sent')
  return any
}

/** Sends the reports that failed to go out when their visit converted. */
export async function retryUnsentReports(
  context: FtJobContext,
  now: DateTime
): Promise<number> {
  // Not the ones the endpoint may be sending this minute, nor any so old
  // that the report would only be news of something long gone
  const before = Math.floor(now.minus({ minutes: 1 }).toSeconds())
  const since = Math.floor(
    now.minus({ hours: flowTraceConfig.retryHours }).toSeconds()
  )
  await expireUnsent(context.db, since, Math.floor(now.toSeconds()))
  let sent = 0
  for (const visit of await readUnsent(context.db, since, before)) {
    if (await reportConversion(context, visit.id, now)) sent++
  }
  return sent
}

export async function sendDigests(context: FtJobContext, now: DateTime) {
  const { db } = context
  const local = now.setZone(flowTraceConfig.zone)
  if (local.hour < flowTraceConfig.digestHour) return
  const today = local.startOf('day')
  const stamp = Math.floor(now.toSeconds())
  const period = today.minus({ days: 1 }).toISODate()!

  const digests: { kind: 'daily' | 'weekly'; days: number }[] = [
    { kind: 'daily', days: 1 },
  ]
  if (local.weekday === flowTraceConfig.digestWeekday) {
    digests.push({ kind: 'weekly', days: 7 })
  }

  for (const { kind, days } of digests) {
    const to = await recipientsFor(context, kind)
    if (!to.length) continue
    if (!(await claimDigest(db, kind, period, stamp))) continue
    const summary = await readSummary(
      db,
      Math.floor(today.minus({ days }).toSeconds()),
      Math.floor(today.toSeconds())
    )
    // A quiet day or week sends nothing: a summary of nothing is noise.
    if (!summary.converted) continue
    const email = renderDigestEmail(summary, kind, context.site)
    let any = false
    for (const address of to) {
      const result = await context
        .send(address, email)
        .catch(() => ({ ok: false }))
      if (result.ok) any = true
    }
    // Not one went out: the next run tries again
    if (!any) await releaseDigest(db, kind, period)
  }
}

export async function runFlowTraceJobs(
  context: FtJobContext,
  now = DateTime.now()
) {
  const resent = await retryUnsentReports(context, now)
  await sendDigests(context, now)
  return { resent }
}
