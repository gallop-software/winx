import 'server-only'
import { DateTime } from 'luxon'
import { getDb } from '@/utils/d1'
import { bareMessageId } from '@/utils/email-events'
import type {
  Campaign,
  CampaignStatus,
  CampaignTotals,
  RecipientFilter,
  RecipientRow,
  RecipientSort,
} from '@/utils/mailing-types'

// Everything the site keeps about its campaigns, in the tables of
// prisma/migrations/0007 and 0008: what was sent, to whom, and what became
// of it. Who is on the list is src/utils/subscribers.ts's to say.

function now(): number {
  return Math.floor(DateTime.now().toSeconds())
}

// --- Campaigns ---

type CampaignRow = {
  id: number
  post_id: number
  post_url: string
  post_title: string
  subject: string
  preheader: string
  status: CampaignStatus
  pause_reason: string
  created_at: number
  started_at: number | null
  finished_at: number | null
}

const CAMPAIGN_COLUMNS =
  'id, post_id, post_url, post_title, subject, preheader, status, pause_reason, created_at, started_at, finished_at'

// Counted as people, not as events: someone who opened five times is one
// open. A bounce after a delivery is still a bounce.
const TOTALS = `
  COUNT(*) AS recipients,
  SUM(status = 'queued') AS queued,
  SUM(status = 'sending') AS unconfirmed,
  SUM(status = 'sent') AS sent,
  SUM(status = 'failed') AS failed,
  SUM(status = 'skipped') AS skipped,
  SUM(delivered_at IS NOT NULL) AS delivered,
  SUM(opens_count > 0) AS opened,
  SUM(clicks_count > 0) AS clicked,
  SUM(bounced_at IS NOT NULL) AS bounced,
  SUM(complained_at IS NOT NULL) AS complained,
  SUM(unsubscribed_at IS NOT NULL) AS unsubscribed`

function toCampaign(row: CampaignRow, totals: Partial<CampaignTotals> | null): Campaign {
  const count = (key: keyof CampaignTotals) => Number(totals?.[key]) || 0
  return {
    id: row.id,
    postId: row.post_id,
    postUrl: row.post_url,
    postTitle: row.post_title,
    subject: row.subject,
    preheader: row.preheader,
    status: row.status,
    pauseReason: row.pause_reason,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    totals: {
      recipients: count('recipients'),
      queued: count('queued'),
      unconfirmed: count('unconfirmed'),
      sent: count('sent'),
      failed: count('failed'),
      skipped: count('skipped'),
      delivered: count('delivered'),
      opened: count('opened'),
      clicked: count('clicked'),
      bounced: count('bounced'),
      complained: count('complained'),
      unsubscribed: count('unsubscribed'),
    },
  }
}

export async function getCampaign(id: number): Promise<Campaign | null> {
  const db = getDb()
  const [campaign, totals] = await db.batch<Record<string, unknown>>([
    db.prepare(`SELECT ${CAMPAIGN_COLUMNS} FROM email_campaigns WHERE id = ?1`).bind(id),
    db.prepare(`SELECT ${TOTALS} FROM email_recipients WHERE campaign_id = ?1`).bind(id),
  ])
  const row = campaign?.results[0] as CampaignRow | undefined
  if (!row) return null
  return toCampaign(row, (totals?.results[0] as Partial<CampaignTotals>) ?? null)
}

// The campaigns sent for one post, newest first.
export async function listCampaigns(postId: number): Promise<Campaign[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT ${CAMPAIGN_COLUMNS
        .split(', ')
        .map((column) => `c.${column}`)
        .join(', ')}, t.*
        FROM email_campaigns c
        LEFT JOIN (
          SELECT campaign_id, ${TOTALS} FROM email_recipients GROUP BY campaign_id
        ) t ON t.campaign_id = c.id
        WHERE c.post_id = ?1
        ORDER BY c.created_at DESC, c.id DESC`
    )
    .bind(postId)
    .all<CampaignRow & Partial<CampaignTotals>>()
  return results.map((row) => toCampaign(row, row))
}

// The email itself, which the lists above leave out: it is only needed to
// send.
export async function getCampaignEmail(
  id: number
): Promise<{ subject: string; html: string; text: string; postUrl: string } | null> {
  const row = await getDb()
    .prepare('SELECT subject, html, text, post_url FROM email_campaigns WHERE id = ?1')
    .bind(id)
    .first<{ subject: string; html: string; text: string; post_url: string }>()
  return row
    ? { subject: row.subject, html: row.html, text: row.text, postUrl: row.post_url }
    : null
}

// Who a campaign goes to: everyone subscribed, or the subscribers an
// administrator ticked (and only those of them still subscribed).
export type Audience = { kind: 'all' } | { kind: 'ids'; ids: number[] }

export type CreatedCampaign = { id: number; queued: number }

// Makes a campaign and the list it goes to, in the database itself: the
// subscribers are copied straight from their table, so a list of tens of
// thousands never travels through the browser.
export async function createCampaign(input: {
  postId: number
  postUrl: string
  postTitle: string
  subject: string
  preheader: string
  html: string
  text: string
  createdBy: number
  audience: Audience
}): Promise<CreatedCampaign> {
  const db = getDb()

  const created = await db
    .prepare(
      `INSERT INTO email_campaigns
        (post_id, post_url, post_title, subject, preheader, html, text, created_by, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        RETURNING id`
    )
    .bind(
      input.postId,
      input.postUrl,
      input.postTitle,
      input.subject,
      input.preheader,
      input.html,
      input.text,
      input.createdBy,
      now()
    )
    .first<{ id: number }>()
  if (!created) throw new Error('The campaign could not be saved')

  const chosen =
    input.audience.kind === 'ids' ? 'AND id IN (SELECT value FROM json_each(?2))' : ''
  const inserted = await db
    .prepare(
      `INSERT INTO email_recipients (campaign_id, subscriber_id, email, name)
        SELECT ?1, id, email, TRIM(first_name || ' ' || last_name)
          FROM subscribers WHERE status = 'subscribed' ${chosen}
          ORDER BY id`
    )
    .bind(
      created.id,
      ...(input.audience.kind === 'ids' ? [JSON.stringify(input.audience.ids)] : [])
    )
    .run()

  return { id: created.id, queued: inserted.meta?.changes ?? 0 }
}

export async function setCampaignStatus(
  id: number,
  status: CampaignStatus,
  pauseReason = ''
): Promise<void> {
  const time = now()
  await getDb()
    .prepare(
      `UPDATE email_campaigns SET
        status = ?2,
        pause_reason = ?3,
        started_at = CASE WHEN ?2 = 'sending' THEN COALESCE(started_at, ?4) ELSE started_at END,
        finished_at = CASE WHEN ?2 = 'sent' THEN ?4 ELSE NULL END
        WHERE id = ?1`
    )
    .bind(id, status, pauseReason, time)
    .run()
}

// A draft nobody was sent is removed whole. Anything that went out is kept:
// it is the record of who was written to.
export async function deleteDraft(id: number): Promise<boolean> {
  const db = getDb()
  const results = await db.batch([
    db
      .prepare(
        `DELETE FROM email_recipients WHERE campaign_id = ?1
          AND EXISTS (SELECT 1 FROM email_campaigns WHERE id = ?1 AND status = 'draft')`
      )
      .bind(id),
    db.prepare(`DELETE FROM email_campaigns WHERE id = ?1 AND status = 'draft'`).bind(id),
  ])
  return results[1]?.meta?.changes === 1
}

// --- Sending ---

export type Claimed = { id: number; email: string; name: string }

// Takes the next few people waiting and marks them as being sent to, in one
// statement, so two requests cannot take the same person. Anyone no longer
// subscribed since the campaign was made (they unsubscribed, bounced on
// another campaign, or were deleted) is skipped instead.
export async function claimRecipients(campaignId: number, limit: number): Promise<Claimed[]> {
  const db = getDb()
  const results = await db.batch<Claimed>([
    db
      .prepare(
        `UPDATE email_recipients SET status = 'skipped',
            error = COALESCE(
              (SELECT status FROM subscribers s WHERE s.id = email_recipients.subscriber_id),
              'deleted')
          WHERE campaign_id = ?1 AND status = 'queued'
            AND NOT EXISTS (
              SELECT 1 FROM subscribers s
                WHERE s.id = email_recipients.subscriber_id AND s.status = 'subscribed')`
      )
      .bind(campaignId),
    db
      .prepare(
        `UPDATE email_recipients SET status = 'sending', claimed_at = ?3
          WHERE id IN (
            SELECT id FROM email_recipients
              WHERE campaign_id = ?1 AND status = 'queued'
              ORDER BY id LIMIT ?2
          )
          RETURNING id, email, name`
      )
      .bind(campaignId, limit, now()),
  ])
  return (results[1]?.results ?? []).sort((a, b) => a.id - b.id)
}

export async function markSent(recipientId: number, messageId: string): Promise<void> {
  const time = now()
  await getDb()
    .prepare(
      `UPDATE email_recipients SET status = 'sent', message_id = ?2, sent_at = ?3,
          last_event_at = ?3, error = ''
        WHERE id = ?1`
    )
    .bind(recipientId, bareMessageId(messageId), time)
    .run()
}

export async function markFailed(recipientId: number, error: string): Promise<void> {
  await getDb()
    .prepare(`UPDATE email_recipients SET status = 'failed', error = ?2 WHERE id = ?1`)
    .bind(recipientId, error.slice(0, 300))
    .run()
}

// Back in the queue, untouched: Cloudflare refused before it took the
// message, so nothing went out.
export async function releaseRecipients(recipientIds: number[]): Promise<void> {
  if (!recipientIds.length) return
  await getDb()
    .prepare(
      `UPDATE email_recipients SET status = 'queued', claimed_at = NULL
        WHERE status = 'sending' AND id IN (${recipientIds.map(() => '?').join(', ')})`
    )
    .bind(...recipientIds)
    .run()
}

// How long a row may stay "sending" before it is taken to be stuck: the
// request that claimed it was cut off, and whether Cloudflare took the
// message is not known.
const STUCK_AFTER_SECONDS = 120

// Puts failed rows, or stuck ones, back in the queue because the
// administrator asked. A stuck row may already have been delivered, which is
// why it is never done without being asked.
export async function requeue(
  campaignId: number,
  which: 'failed' | 'unconfirmed'
): Promise<number> {
  const db = getDb()
  const result =
    which === 'failed'
      ? await db
          .prepare(
            `UPDATE email_recipients SET status = 'queued', error = '', claimed_at = NULL
              WHERE campaign_id = ?1 AND status = 'failed'`
          )
          .bind(campaignId)
          .run()
      : await db
          .prepare(
            `UPDATE email_recipients SET status = 'queued', claimed_at = NULL
              WHERE campaign_id = ?1 AND status = 'sending' AND claimed_at < ?2`
          )
          .bind(campaignId, now() - STUCK_AFTER_SECONDS)
          .run()
  return result.meta?.changes ?? 0
}

// --- What became of it ---

type Target = { id: number; campaign_id: number; email: string; subscriber_id: number | null }

async function target(recipientId: number): Promise<Target | null> {
  return getDb()
    .prepare('SELECT id, campaign_id, email, subscriber_id FROM email_recipients WHERE id = ?1')
    .bind(recipientId)
    .first<Target>()
}

export async function recordOpen(recipientId: number): Promise<void> {
  const db = getDb()
  const time = now()
  await db.batch([
    db
      .prepare(
        `INSERT INTO email_events (campaign_id, recipient_id, type, created_at)
          SELECT campaign_id, id, 'open', ?2 FROM email_recipients WHERE id = ?1`
      )
      .bind(recipientId, time),
    db
      .prepare(
        `UPDATE email_recipients SET opens_count = opens_count + 1,
            first_opened_at = COALESCE(first_opened_at, ?2), last_event_at = ?2
          WHERE id = ?1`
      )
      .bind(recipientId, time),
  ])
}

// A click is also an open: the pictures in the email may be switched off,
// but nobody clicks a link in an email they have not opened.
export async function recordClick(recipientId: number, url: string): Promise<void> {
  const db = getDb()
  const time = now()
  await db.batch([
    db
      .prepare(
        `INSERT INTO email_events (campaign_id, recipient_id, type, url, created_at)
          SELECT campaign_id, id, 'click', ?3, ?2 FROM email_recipients WHERE id = ?1`
      )
      .bind(recipientId, time, url.slice(0, 2000)),
    db
      .prepare(
        `UPDATE email_recipients SET clicks_count = clicks_count + 1,
            first_clicked_at = COALESCE(first_clicked_at, ?2),
            opens_count = MAX(opens_count, 1),
            first_opened_at = COALESCE(first_opened_at, ?2), last_event_at = ?2
          WHERE id = ?1`
      )
      .bind(recipientId, time),
  ])
}

// The recipient used the unsubscribe link: they come off the list, and the
// campaign's report shows it.
export async function recordUnsubscribe(recipientId: number): Promise<boolean> {
  const row = await target(recipientId)
  if (!row) return false

  const db = getDb()
  const time = now()
  await db.batch([
    db
      .prepare(
        `UPDATE subscribers SET status = 'unsubscribed',
            unsubscribed_at = COALESCE(unsubscribed_at, ?2), updated_at = ?2
          WHERE status IN ('subscribed', 'pending')
            AND (id = ?1 OR (?1 IS NULL AND email = ?3))`
      )
      .bind(row.subscriber_id, time, row.email),
    db
      .prepare(
        `INSERT INTO email_events (campaign_id, recipient_id, type, created_at)
          SELECT ?1, ?2, 'unsubscribed', ?3
          WHERE NOT EXISTS (SELECT 1 FROM email_recipients WHERE id = ?2 AND unsubscribed_at IS NOT NULL)`
      )
      .bind(row.campaign_id, row.id, time),
    db
      .prepare(
        `UPDATE email_recipients SET unsubscribed_at = COALESCE(unsubscribed_at, ?2), last_event_at = ?2
          WHERE id = ?1`
      )
      .bind(row.id, time),
  ])

  return true
}

// --- Reports ---

const FILTERS: Record<RecipientFilter, string> = {
  all: '',
  delivered: 'AND delivered_at IS NOT NULL',
  opened: 'AND opens_count > 0',
  clicked: 'AND clicks_count > 0',
  unopened: "AND status = 'sent' AND opens_count = 0",
  bounced: 'AND bounced_at IS NOT NULL',
  unsubscribed: 'AND unsubscribed_at IS NOT NULL',
  complained: 'AND complained_at IS NOT NULL',
  failed: "AND status IN ('failed', 'sending')",
  skipped: "AND status = 'skipped'",
  queued: "AND status = 'queued'",
}

const SORTS: Record<RecipientSort, string> = {
  name: 'name COLLATE NOCASE',
  email: 'email',
  status: 'status',
  opens: 'opens_count',
  clicks: 'clicks_count',
  activity: 'last_event_at',
}

export const RECIPIENTS_PER_PAGE = 50

type RecipientDbRow = {
  id: number
  subscriber_id: number | null
  email: string
  name: string
  status: RecipientRow['status']
  error: string
  sent_at: number | null
  delivered_at: number | null
  bounced_at: number | null
  bounce_type: string
  complained_at: number | null
  unsubscribed_at: number | null
  opens_count: number
  clicks_count: number
  last_event_at: number | null
}

export async function listRecipients(
  campaignId: number,
  options: {
    filter: RecipientFilter
    search: string
    sort: RecipientSort
    descending: boolean
    page: number
  }
): Promise<{ rows: RecipientRow[]; total: number }> {
  const db = getDb()
  const where = `WHERE campaign_id = ?1 ${FILTERS[options.filter] ?? ''}
    AND (?2 = '' OR email LIKE ?3 ESCAPE '\\' OR name LIKE ?3 ESCAPE '\\')`
  const search = options.search.trim().toLowerCase()
  const like = `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
  const direction = options.descending ? 'DESC' : 'ASC'
  const order = `${SORTS[options.sort] ?? SORTS.activity} ${direction} NULLS LAST, id ASC`
  const page = Math.max(1, options.page)

  const [rows, count] = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `SELECT id, subscriber_id, email, name, status, error, sent_at, delivered_at, bounced_at,
            bounce_type, complained_at, unsubscribed_at, opens_count, clicks_count, last_event_at
          FROM email_recipients ${where}
          ORDER BY ${order}
          LIMIT ?4 OFFSET ?5`
      )
      .bind(campaignId, search, like, RECIPIENTS_PER_PAGE, (page - 1) * RECIPIENTS_PER_PAGE),
    db.prepare(`SELECT COUNT(*) AS total FROM email_recipients ${where}`).bind(campaignId, search, like),
  ])

  return {
    rows: ((rows?.results ?? []) as RecipientDbRow[]).map((row) => ({
      id: row.id,
      subscriberId: row.subscriber_id,
      email: row.email,
      name: row.name,
      status: row.status,
      error: row.error,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      bouncedAt: row.bounced_at,
      bounceType: row.bounce_type,
      complainedAt: row.complained_at,
      unsubscribedAt: row.unsubscribed_at,
      opens: row.opens_count,
      clicks: row.clicks_count,
      lastEventAt: row.last_event_at,
    })),
    total: Number((count?.results[0] as { total?: number } | undefined)?.total) || 0,
  }
}
