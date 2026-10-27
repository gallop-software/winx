import { DateTime } from 'luxon'
import { NextResponse, type NextRequest } from 'next/server'
import { isSameOrigin, visitorIp } from '@/utils/comment-guard'
import { getDb } from '@/utils/d1'
import { getLatestPost, getPostByUrl } from '@/utils/content-index'
import { composePostEmail } from '@/utils/email-compose'
import { unpersonalised } from '@/utils/email-tracking'
import { renderVisitEmail } from '@/utils/flow-trace-email'
import { flowTraceContext } from '@/utils/flow-trace-mail'
import type { FtEvent, FtVisit, FtVisitReport } from '@/utils/flow-trace-types'
import {
  allowAttempt,
  hashAddress,
  hashSubject,
  refundAttempt,
} from '@/utils/member-guard'
import { normalizePostUrl } from '@/utils/post-url'
import { readJsonObject } from '@/utils/read-body'
import { inboxOf, isEmail, sendEmailMessage } from '@/utils/send-email'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

function answer(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

// A FlowTrace report on a made-up visit, for the demo: someone who came from
// a search, read the latest post and the About page, and joined the list.
// Nothing in it is a real reader's; the post is the site's own, published.
async function sampleReport(): Promise<FtVisitReport | null> {
  const post = await getLatestPost()
  if (!post) return null
  const now = Math.floor(DateTime.now().toSeconds())
  const start = now - 14 * 60
  const step = (
    id: number,
    after: number,
    type: FtEvent['type'],
    path: string,
    title: string,
    engagedMs = 0,
    label = ''
  ): FtEvent => ({
    id,
    at: start + after,
    type,
    path,
    title,
    label,
    href: '',
    engagedMs,
  })
  const events = [
    step(1, 0, 'pageview', '/', 'Home', 41000),
    step(
      2,
      45,
      'pageview',
      `${post.url}/`,
      post.metadata.title ?? 'A post',
      384000
    ),
    step(3, 440, 'pageview', '/about/', 'About', 62000),
    step(
      4,
      510,
      'pageview',
      `${post.url}/`,
      post.metadata.title ?? 'A post',
      95000
    ),
    step(
      5,
      612,
      'newsletter',
      `${post.url}/`,
      post.metadata.title ?? 'A post',
      0,
      'Newsletter form'
    ),
  ]
  const visit: FtVisit = {
    id: 'sample',
    visitorId: 'sample',
    visitNumber: 3,
    startedAt: start,
    lastAt: start + 612,
    entryPath: '/',
    referrer: 'google.com',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmTerm: '',
    utmContent: '',
    country: 'US',
    region: 'Texas',
    city: 'Austin',
    device: 'desktop',
    browser: 'Chrome',
    os: 'macOS',
    // From the range set aside for examples, so it is nobody's.
    ip: '203.0.113.42',
    pageviews: 4,
    engagedMs: 582000,
    conversions: 1,
    firstConversion: 'newsletter',
    reportedAt: now,
    reportStatus: 'sent',
    firstSeen: now - 9 * 86400,
    visitorEngagedMs: 1310000,
  }
  return { visit, events, otherVisits: [], sends: [] }
}

// Notes that an inbox has had one kind of demo email, and says whether it
// is the first time. Only a keyed hash of the inbox is kept, and the note is
// taken back if the email then does not go.
async function firstTime(kind: string, inboxHash: string): Promise<boolean> {
  const result = await getDb()
    .prepare(
      'INSERT OR IGNORE INTO demo_sends (kind, address_hash, created_at) VALUES (?1, ?2, ?3)'
    )
    .bind(kind, inboxHash, Math.floor(DateTime.now().toSeconds()))
    .run()
  return result.meta?.changes === 1
}

async function forget(kind: string, inboxHash: string): Promise<void> {
  await getDb()
    .prepare('DELETE FROM demo_sends WHERE kind = ?1 AND address_hash = ?2')
    .bind(kind, inboxHash)
    .run()
}

// The demo's site-wide allowance for the day, spent as it is checked, in one
// statement, so requests that arrive together cannot all slip past it.
async function spendTotal(): Promise<boolean> {
  return (await allowAttempt({ kind: 'demo-email-total', ipHash: 'all' })).ok
}

const ALL_USED =
  'The demo has sent all its emails for today. Try again tomorrow.'

// The demo toolbar, for anyone: a published post as the email it would be
// sent as (`preview`), that email sent to an address the visitor gives
// (`send`), or a FlowTrace report on a made-up visit (`flowtrace-test`).
//
// Nothing here reads the mailing list or anything else that is not already
// public. A sent email is the post as written, under its own title: what a
// visitor types into the demo's subject and preheader is shown in the
// preview but never sent, so the site's address cannot carry their words.
// The post goes once a day per visitor and per inbox; the report once per
// inbox, ever, and five a day per visitor; and both share a few dozen a day
// for the whole site.
export async function POST(req: NextRequest) {
  // Only on a site that turns the demo on (src/hooks/use-demo.tsx).
  if (process.env.NEXT_PUBLIC_ADMIN_DEMO !== 'true') {
    return answer({ message: 'Not found' }, 404)
  }
  if (!isSameOrigin(req)) return answer({ message: 'Not from this site' }, 403)

  const input = await readJsonObject(req, 4 * 1024)
  if (input === null || input === 'too_large') {
    return answer({ message: 'The request could not be read.' }, 400)
  }

  // A FlowTrace test report, once per inbox, and five a day per visitor (who
  // may well try it for a colleague or two).
  if (input.action === 'flowtrace-test') {
    const to = String(input.email ?? '').trim()
    if (!isEmail(to))
      return answer({ message: 'Enter an email address to send it to.' }, 400)
    const report = await sampleReport()
    if (!report)
      return answer(
        { message: 'There is no post to build the report from yet.' },
        404
      )
    // The inbox, not the address as typed: a +tag or Gmail's dots do not
    // make a second one.
    const inbox = await hashSubject(inboxOf(to))
    // Five a day from one visitor, whichever addresses they give.
    const visitor = {
      kind: 'demo-report' as const,
      ipHash: await hashAddress(visitorIp(req)),
    }
    if (!(await allowAttempt(visitor)).ok) {
      return answer(
        {
          message:
            'The demo sends five test reports a day. Try again tomorrow.',
        },
        429
      )
    }
    if (!(await firstTime('flowtrace-test', inbox))) {
      // Nothing sent, so it is not one of their five.
      await refundAttempt(visitor)
      return answer(
        {
          message: 'That address has already had its test report.',
          used: true,
        },
        429
      )
    }
    if (!(await spendTotal())) {
      await refundAttempt(visitor)
      await forget('flowtrace-test', inbox)
      return answer({ message: ALL_USED }, 429)
    }
    const context = flowTraceContext()
    const email = renderVisitEmail(report, context.site)
    // Its links (the visit, the email settings) open the demo's FlowTrace
    // box: the visit only exists in this email, and the reader is not an
    // administrator.
    const toDemo = (body: string) =>
      body.replace(/\?flowtrace=[A-Za-z0-9%_-]*/g, '?flowtrace=demo')
    const sent = await context.send(to, {
      subject: `[Demo] ${email.subject}`,
      html: toDemo(email.html),
      text: toDemo(email.text),
    })
    if (!sent.ok) {
      // Not sent, so the address and the visitor may try again.
      await forget('flowtrace-test', inbox)
      await refundAttempt(visitor)
      console.error(`A demo FlowTrace report was not sent: ${sent.code}`)
      return answer(
        { message: 'The report could not be sent. Try again later.' },
        502
      )
    }
    return answer({ result: 'sent', sentTo: to })
  }

  const path = normalizePostUrl(String(input.path ?? ''))
  const email =
    path && (await getPostByUrl(path))
      ? // Only the preview takes the visitor's subject and preheader.
        await composePostEmail(path, input.action === 'preview' ? input : {})
      : null
  if (!email) return answer({ message: 'That post was not found.' }, 404)

  if (input.action === 'preview') {
    return answer({
      postId: email.postId,
      subject: email.subject,
      preheader: email.preheader,
      html: unpersonalised(email).html,
    })
  }
  if (input.action !== 'send') return answer({ message: 'Unknown action' }, 400)

  const to = String(input.email ?? '').trim()
  if (!isEmail(to))
    return answer({ message: 'Enter an email address to send it to.' }, 400)

  // This visitor's and this inbox's one a day first, then everyone's.
  const attempt = {
    kind: 'demo-email' as const,
    ipHash: await hashAddress(visitorIp(req)),
    subjectHash: await hashSubject(inboxOf(to)),
  }
  const mine = await allowAttempt(attempt)
  if (!mine.ok) {
    return answer(
      {
        message: 'The demo sends one email a day. You have used yours.',
        used: true,
      },
      429
    )
  }
  // Not sent, whichever way: the visitor keeps their one for the day.
  if (!(await spendTotal())) {
    await refundAttempt(attempt)
    return answer({ message: ALL_USED }, 429)
  }

  const { html, text } = unpersonalised(email)
  const sent = await sendEmailMessage({
    to,
    subject: `[Demo] ${email.subject}`,
    html,
    text,
  })
  if (!sent.ok) {
    await refundAttempt(attempt)
    console.error(`A demo email was not sent: ${sent.code}`)
    return answer(
      { message: 'The email could not be sent. Try again later.' },
      502
    )
  }

  return answer({ sentTo: to, used: true })
}
