import 'server-only'
import { DateTime } from 'luxon'
import { getDb, type D1Statement } from '@/utils/d1'
import { isEmail } from '@/utils/send-email'
import type { Member } from '@/utils/member-types'
import type {
  BulkCheck,
  NewSubscriber,
  SubscriberCounts,
  SubscriberHistoryRow,
  SubscriberRow,
  SubscriberSort,
  SubscriberStatus,
  SubscriberStatusFilter,
} from '@/utils/mailing-types'

// The mailing list, in the subscribers table of
// prisma/migrations/0008_subscribers.sql. Who gets marketing email is
// decided here and nowhere else: a WordPress account says nothing about it.

const NAME_MAX = 100

function now(): number {
  return Math.floor(DateTime.now().toSeconds())
}

export function normaliseEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function cleanName(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : ''
}

type Row = {
  id: number
  email: string
  first_name: string
  last_name: string
  status: SubscriberStatus
  source: SubscriberRow['source']
  user_id: number | null
  created_at: number
  updated_at: number
  confirmed_at: number | null
  unsubscribed_at: number | null
  last_opened_at?: number | null
}

const COLUMNS =
  'id, email, first_name, last_name, status, source, user_id, created_at, updated_at, confirmed_at, unsubscribed_at'

function toRow(row: Row): SubscriberRow {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status,
    source: row.source,
    userId: row.user_id,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    unsubscribedAt: row.unsubscribed_at,
    lastOpenedAt: row.last_opened_at ?? null,
  }
}

async function byEmail(email: string): Promise<Row | null> {
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM subscribers WHERE email = ?1`)
    .bind(email)
    .first<Row>()
}

export async function getSubscriber(id: number): Promise<SubscriberRow | null> {
  const row = await getDb()
    .prepare(`SELECT ${COLUMNS} FROM subscribers WHERE id = ?1`)
    .bind(id)
    .first<Row>()
  return row ? toRow(row) : null
}

// --- Joining and leaving ---

// Someone asked, through the form on the site, to be sent new essays. The
// address is not on the list until they confirm it: until then anyone could
// sign up someone else's. Returns the row to send a confirmation to, or null
// when they are already subscribed and nothing needs sending.
export async function requestSubscription(input: {
  email: string
  firstName?: string
  lastName?: string
  source: 'signup' | 'admin' | 'member'
  userId?: number
}): Promise<{ id: number; email: string; firstName: string } | null> {
  const email = normaliseEmail(input.email)
  const firstName = cleanName(input.firstName)
  const lastName = cleanName(input.lastName)
  const time = now()
  const existing = await byEmail(email)

  // Already on the list, or an address that bounced or reported the site
  // as spam: nothing is sent. The form answers the same either way.
  if (
    existing?.status === 'subscribed' ||
    existing?.status === 'bounced' ||
    existing?.status === 'complained'
  ) {
    return null
  }

  if (existing) {
    await getDb()
      .prepare(
        `UPDATE subscribers SET status = 'pending',
            first_name = CASE WHEN ?2 <> '' THEN ?2 ELSE first_name END,
            last_name = CASE WHEN ?3 <> '' THEN ?3 ELSE last_name END,
            user_id = COALESCE(user_id, ?4),
            updated_at = ?5
          WHERE id = ?1`
      )
      .bind(existing.id, firstName, lastName, input.userId ?? null, time)
      .run()
    return { id: existing.id, email, firstName: firstName || existing.first_name }
  }

  const created = await getDb()
    .prepare(
      `INSERT INTO subscribers (email, first_name, last_name, status, source, user_id, created_at, updated_at)
        VALUES (?1, ?2, ?3, 'pending', ?4, ?5, ?6, ?6)
        RETURNING id`
    )
    .bind(email, firstName, lastName, input.source, input.userId ?? null, time)
    .first<{ id: number }>()
  if (!created) throw new Error('The subscriber could not be saved')
  return { id: created.id, email, firstName }
}

// The link in the confirmation email was used. Only the address the link was
// made for is confirmed: if the row's address has changed since, nothing is.
export async function confirmSubscription(id: number, email: string): Promise<boolean> {
  const time = now()
  const result = await getDb()
    .prepare(
      `UPDATE subscribers SET status = 'subscribed', confirmed_at = ?3, unsubscribed_at = NULL, updated_at = ?3
        WHERE id = ?1 AND email = ?2`
    )
    .bind(id, normaliseEmail(email), time)
    .run()
  return (result.meta?.changes ?? 0) === 1
}

// --- Members ---

// Whether a logged-in member is on the list. Read from here rather than
// kept in their cookie, so an unsubscribe from an email shows on their card
// at once.
export async function isMemberSubscribed(userId: number): Promise<boolean> {
  const row = await getDb()
    .prepare(`SELECT status FROM subscribers WHERE user_id = ?1`)
    .bind(userId)
    .first<{ status: SubscriberStatus }>()
  return row?.status === 'subscribed'
}

// A member as the browser is told about them, with their subscription.
export async function withSubscription(member: Member): Promise<Member> {
  try {
    return { ...member, subscribed: await isMemberSubscribed(member.id) }
  } catch (error) {
    console.error('Could not read a member’s subscription:', error)
    return { ...member, subscribed: false }
  }
}

// The member's own row: linked to their account, or the row for their
// address, which is then linked.
async function memberRow(userId: number, email: string): Promise<Row | null> {
  const db = getDb()
  const linked = await db
    .prepare(`SELECT ${COLUMNS} FROM subscribers WHERE user_id = ?1`)
    .bind(userId)
    .first<Row>()
  if (linked) return linked
  const row = await byEmail(email)
  if (row && row.user_id === null) {
    await db.prepare('UPDATE subscribers SET user_id = ?2 WHERE id = ?1').bind(row.id, userId).run()
    return { ...row, user_id: userId }
  }
  return row
}

export type MemberSubscriptionOutcome =
  | { subscribed: boolean; pending?: false; blocked?: boolean }
  // Their address is not yet confirmed with WordPress, so a confirmation
  // email has to go out first.
  | { subscribed: false; pending: true; id: number; email: string; firstName: string }

// A logged-in member pressed Subscribe or Unsubscribe. WordPress has already
// confirmed the address belongs to them, unless they changed it and have not
// confirmed the new one yet: then they are sent a confirmation like anyone.
export async function setMemberSubscription(input: {
  userId: number
  email: string
  firstName: string
  lastName: string
  verified: boolean
  subscribed: boolean
}): Promise<MemberSubscriptionOutcome> {
  const email = normaliseEmail(input.email)
  const time = now()
  const db = getDb()
  const row = await memberRow(input.userId, email)

  // An address that bounced or reported the site as spam is never written
  // to again, by the member's own switch either.
  if (input.subscribed && (row?.status === 'bounced' || row?.status === 'complained')) {
    return { subscribed: false, blocked: true }
  }

  if (!input.subscribed) {
    if (row && row.status !== 'unsubscribed') {
      await db
        .prepare(
          `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ?2, updated_at = ?2 WHERE id = ?1`
        )
        .bind(row.id, time)
        .run()
    }
    return { subscribed: false }
  }

  if (!input.verified) {
    const pending = await requestSubscription({
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      source: 'member',
      userId: input.userId,
    })
    return pending ? { subscribed: false, pending: true, ...pending } : { subscribed: true }
  }

  if (row) {
    await db
      .prepare(
        `UPDATE subscribers SET status = 'subscribed', confirmed_at = COALESCE(confirmed_at, ?2),
            unsubscribed_at = NULL, updated_at = ?2,
            first_name = CASE WHEN first_name = '' THEN ?3 ELSE first_name END,
            last_name = CASE WHEN last_name = '' THEN ?4 ELSE last_name END
          WHERE id = ?1`
      )
      .bind(row.id, time, cleanName(input.firstName), cleanName(input.lastName))
      .run()
  } else {
    await db
      .prepare(
        `INSERT INTO subscribers (email, first_name, last_name, status, source, user_id, created_at, updated_at, confirmed_at)
          VALUES (?1, ?2, ?3, 'subscribed', 'member', ?4, ?5, ?5, ?5)`
      )
      .bind(email, cleanName(input.firstName), cleanName(input.lastName), input.userId, time)
      .run()
  }
  return { subscribed: true }
}

// A member changed their email address: their subscription goes with them.
// If the new address is already on the list as someone else's row, that row
// stays as it is and the member's old row is left alone.
export async function moveMemberEmail(userId: number, email: string): Promise<void> {
  const next = normaliseEmail(email)
  const taken = await byEmail(next)
  if (taken) return
  await getDb()
    .prepare('UPDATE subscribers SET email = ?2, updated_at = ?3 WHERE user_id = ?1')
    .bind(userId, next, now())
    .run()
}

// --- What became of the mail ---

// The unsubscribe link in a campaign was used.
export async function unsubscribeSubscriber(id: number): Promise<void> {
  const time = now()
  await getDb()
    .prepare(
      `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = COALESCE(unsubscribed_at, ?2), updated_at = ?2
        WHERE id = ?1 AND status IN ('subscribed', 'pending')`
    )
    .bind(id, time)
    .run()
}

// --- Managing the list ---

const STATUS_FILTERS: Record<SubscriberStatusFilter, string> = {
  all: '',
  subscribed: "AND status = 'subscribed'",
  pending: "AND status = 'pending'",
  unsubscribed: "AND status = 'unsubscribed'",
  bounced: "AND status = 'bounced'",
  complained: "AND status = 'complained'",
}

const SORTS: Record<SubscriberSort, string> = {
  email: 'email',
  name: "first_name || ' ' || last_name COLLATE NOCASE",
  status: 'status',
  added: 'created_at',
  opened: 'last_opened_at',
}

export const SUBSCRIBERS_PER_PAGE = 50

export type SubscriberQuery = {
  status: SubscriberStatusFilter
  search: string
}

const STATUSES = Object.keys(STATUS_FILTERS) as SubscriberStatusFilter[]

// A filter as a request gave it, made safe to use.
export function queryOf(value: { status?: unknown; search?: unknown }): SubscriberQuery {
  return {
    status: STATUSES.find((status) => status === value.status) ?? 'all',
    search: typeof value.search === 'string' ? value.search.slice(0, 100) : '',
  }
}

// The WHERE clause and its values for a filter, shared by the list, the
// actions on "everyone matching", and the export.
function where(query: SubscriberQuery): { sql: string; values: unknown[] } {
  const search = query.search.trim().toLowerCase()
  const like = `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
  return {
    sql: `WHERE 1 = 1 ${STATUS_FILTERS[query.status] ?? ''}
      AND (?1 = '' OR email LIKE ?2 ESCAPE '\\'
        OR (first_name || ' ' || last_name) LIKE ?2 ESCAPE '\\')`,
    values: [search, like],
  }
}

const LAST_OPENED = `(SELECT MAX(first_opened_at) FROM email_recipients r WHERE r.subscriber_id = subscribers.id)`

export async function listSubscribers(
  query: SubscriberQuery & { sort: SubscriberSort; descending: boolean; page: number }
): Promise<{ rows: SubscriberRow[]; total: number; counts: SubscriberCounts }> {
  const db = getDb()
  const filter = where(query)
  const order = `${SORTS[query.sort] ?? SORTS.added} ${query.descending ? 'DESC' : 'ASC'} NULLS LAST, id DESC`
  const page = Math.max(1, query.page)

  const [rows, total, counts] = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `SELECT ${COLUMNS}, ${LAST_OPENED} AS last_opened_at FROM subscribers ${filter.sql}
          ORDER BY ${order} LIMIT ?3 OFFSET ?4`
      )
      .bind(...filter.values, SUBSCRIBERS_PER_PAGE, (page - 1) * SUBSCRIBERS_PER_PAGE),
    db.prepare(`SELECT COUNT(*) AS total FROM subscribers ${filter.sql}`).bind(...filter.values),
    db.prepare('SELECT status, COUNT(*) AS n FROM subscribers GROUP BY status'),
  ])

  const byStatus = new Map(
    ((counts?.results ?? []) as { status: SubscriberStatus; n: number }[]).map((row) => [
      row.status,
      Number(row.n),
    ])
  )
  const count = (status: SubscriberStatus) => byStatus.get(status) ?? 0

  return {
    rows: ((rows?.results ?? []) as Row[]).map(toRow),
    total: Number((total?.results[0] as { total?: number } | undefined)?.total) || 0,
    counts: {
      all: [...byStatus.values()].reduce((sum, n) => sum + n, 0),
      subscribed: count('subscribed'),
      pending: count('pending'),
      unsubscribed: count('unsubscribed'),
      bounced: count('bounced'),
      complained: count('complained'),
    },
  }
}

export async function countSubscribed(): Promise<number> {
  const row = await getDb()
    .prepare(`SELECT COUNT(*) AS n FROM subscribers WHERE status = 'subscribed'`)
    .first<{ n: number }>()
  return Number(row?.n) || 0
}

// Every row matching a filter, for the export.
export async function exportSubscribers(query: SubscriberQuery): Promise<SubscriberRow[]> {
  const filter = where(query)
  const { results } = await getDb()
    .prepare(`SELECT ${COLUMNS} FROM subscribers ${filter.sql} ORDER BY id`)
    .bind(...filter.values)
    .all<Row>()
  return results.map(toRow)
}

// What adding a list would do, before anything is saved: which addresses
// are new, which are already there and how, which are not addresses at all,
// and which were pasted twice.
export async function checkSubscribers(list: NewSubscriber[]): Promise<BulkCheck> {
  const seen = new Set<string>()
  const valid: { email: string; firstName: string; lastName: string }[] = []
  const check: BulkCheck = {
    add: [],
    subscribed: [],
    pending: [],
    leftAlone: [],
    invalid: [],
    duplicates: 0,
  }

  for (const item of list) {
    const email = normaliseEmail(item.email)
    if (!isEmail(email)) {
      if (String(item.email ?? '').trim()) check.invalid.push(String(item.email).trim().slice(0, 200))
      continue
    }
    if (seen.has(email)) {
      check.duplicates++
      continue
    }
    seen.add(email)
    valid.push({ email, firstName: cleanName(item.firstName), lastName: cleanName(item.lastName) })
  }

  const existing = new Map<string, SubscriberStatus>()
  for (let i = 0; i < valid.length; i += 500) {
    const chunk = valid.slice(i, i + 500).map((item) => item.email)
    const { results } = await getDb()
      .prepare('SELECT email, status FROM subscribers WHERE email IN (SELECT value FROM json_each(?1))')
      .bind(JSON.stringify(chunk))
      .all<{ email: string; status: SubscriberStatus }>()
    for (const row of results) existing.set(row.email, row.status)
  }

  for (const item of valid) {
    const status = existing.get(item.email)
    if (!status) check.add.push(item)
    else if (status === 'subscribed') check.subscribed.push(item.email)
    else if (status === 'pending') check.pending.push(item.email)
    else check.leftAlone.push({ email: item.email, status })
  }
  return check
}

// Adds addresses that are not on the list yet. Anyone already there, in
// whatever state, is left as they are: an administrator never undoes an
// unsubscribe by pasting a list. Returns the new rows waiting for a
// confirmation email, when that is how they were added.
export async function addSubscribers(
  list: NewSubscriber[],
  mode: 'subscribed' | 'confirm'
): Promise<{ added: number; toConfirm: { id: number; email: string; firstName: string }[] }> {
  const check = await checkSubscribers(list)
  const db = getDb()
  const time = now()
  const status = mode === 'subscribed' ? 'subscribed' : 'pending'
  const statements: D1Statement[] = []

  // 7 values a row, 14 rows a statement: under the 100 a statement may bind.
  for (let i = 0; i < check.add.length; i += 14) {
    const chunk = check.add.slice(i, i + 14)
    statements.push(
      db
        .prepare(
          `INSERT INTO subscribers (email, first_name, last_name, status, source, created_at, updated_at, confirmed_at)
            VALUES ${chunk.map(() => "(?, ?, ?, ?, 'admin', ?, ?, ?)").join(', ')}
            ON CONFLICT (email) DO NOTHING`
        )
        .bind(
          ...chunk.flatMap((item) => [
            item.email,
            item.firstName,
            item.lastName,
            status,
            time,
            time,
            mode === 'subscribed' ? time : null,
          ])
        )
    )
  }
  for (let i = 0; i < statements.length; i += 50) {
    await db.batch(statements.slice(i, i + 50))
  }

  if (mode === 'subscribed' || !check.add.length) {
    return { added: check.add.length, toConfirm: [] }
  }

  const { results } = await db
    .prepare(
      `SELECT id, email, first_name FROM subscribers
        WHERE status = 'pending' AND email IN (SELECT value FROM json_each(?1))`
    )
    .bind(JSON.stringify(check.add.map((item) => item.email)))
    .all<{ id: number; email: string; first_name: string }>()
  return {
    added: check.add.length,
    toConfirm: results.map((row) => ({ id: row.id, email: row.email, firstName: row.first_name })),
  }
}

// Which rows an action applies to: the ones ticked, or everyone matching
// the filter on screen.
export type Selection = { ids: number[] } | { query: SubscriberQuery }

function selected(selection: Selection): { sql: string; values: unknown[] } {
  if ('ids' in selection) {
    return {
      sql: 'id IN (SELECT value FROM json_each(?1))',
      values: [JSON.stringify(selection.ids)],
    }
  }
  const filter = where(selection.query)
  return {
    sql: `id IN (SELECT id FROM subscribers ${filter.sql})`,
    values: filter.values,
  }
}

// The placeholders of a selection's values come first, so the rest of a
// statement numbers its own from here.
function after(selection: Selection): number {
  return 'ids' in selection ? 2 : 3
}

export async function unsubscribeSelected(selection: Selection): Promise<number> {
  const target = selected(selection)
  const n = after(selection)
  const result = await getDb()
    .prepare(
      `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ?${n}, updated_at = ?${n}
        WHERE ${target.sql} AND status IN ('subscribed', 'pending')`
    )
    .bind(...target.values, now())
    .run()
  return result.meta?.changes ?? 0
}

// Back on the list, on an administrator's word that they asked to be. An
// address that reported a message as spam is only put back when that was
// said in so many words.
export async function resubscribeSelected(
  selection: Selection,
  includeComplaints: boolean
): Promise<number> {
  const target = selected(selection)
  const n = after(selection)
  const statuses = includeComplaints
    ? "('unsubscribed', 'bounced', 'pending', 'complained')"
    : "('unsubscribed', 'bounced', 'pending')"
  const result = await getDb()
    .prepare(
      `UPDATE subscribers SET status = 'subscribed', unsubscribed_at = NULL,
          confirmed_at = COALESCE(confirmed_at, ?${n}), updated_at = ?${n}
        WHERE ${target.sql} AND status IN ${statuses}`
    )
    .bind(...target.values, now())
    .run()
  return result.meta?.changes ?? 0
}

// The rows waiting for a confirmation, to send it again.
export async function pendingSelected(
  selection: Selection,
  limit: number
): Promise<{ id: number; email: string; firstName: string }[]> {
  const target = selected(selection)
  const { results } = await getDb()
    .prepare(
      `SELECT id, email, first_name FROM subscribers WHERE ${target.sql} AND status = 'pending'
        ORDER BY id LIMIT ${Math.max(1, Math.floor(limit))}`
    )
    .bind(...target.values)
    .all<{ id: number; email: string; first_name: string }>()
  return results.map((row) => ({ id: row.id, email: row.email, firstName: row.first_name }))
}

// Removes rows for good. A campaign's report keeps the addresses it went to;
// the link from those rows to the subscriber is cleared.
export async function deleteSelected(selection: Selection): Promise<number> {
  const db = getDb()
  const target = selected(selection)
  const results = await db.batch([
    db
      .prepare(
        `UPDATE email_recipients SET subscriber_id = NULL
          WHERE subscriber_id IN (SELECT id FROM subscribers WHERE ${target.sql})`
      )
      .bind(...target.values),
    db.prepare(`DELETE FROM subscribers WHERE ${target.sql}`).bind(...target.values),
  ])
  return results[1]?.meta?.changes ?? 0
}

export async function renameSubscriber(id: number, firstName: unknown, lastName: unknown): Promise<void> {
  await getDb()
    .prepare('UPDATE subscribers SET first_name = ?2, last_name = ?3, updated_at = ?4 WHERE id = ?1')
    .bind(id, cleanName(firstName), cleanName(lastName), now())
    .run()
}

// The campaigns one subscriber was sent, newest first.
export async function subscriberHistory(id: number): Promise<SubscriberHistoryRow[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT c.id AS campaign_id, c.subject, c.post_title, r.status, r.sent_at, r.delivered_at,
          r.bounced_at, r.opens_count, r.clicks_count, r.unsubscribed_at, r.complained_at
        FROM email_recipients r JOIN email_campaigns c ON c.id = r.campaign_id
        WHERE r.subscriber_id = ?1
        ORDER BY r.id DESC LIMIT 100`
    )
    .bind(id)
    .all<{
      campaign_id: number
      subject: string
      post_title: string
      status: SubscriberHistoryRow['status']
      sent_at: number | null
      delivered_at: number | null
      bounced_at: number | null
      opens_count: number
      clicks_count: number
      unsubscribed_at: number | null
      complained_at: number | null
    }>()
  return results.map((row) => ({
    campaignId: row.campaign_id,
    subject: row.subject,
    postTitle: row.post_title,
    status: row.status,
    sentAt: row.sent_at,
    delivered: row.delivered_at !== null,
    bounced: row.bounced_at !== null,
    opens: row.opens_count,
    clicks: row.clicks_count,
    unsubscribed: row.unsubscribed_at !== null,
    complained: row.complained_at !== null,
  }))
}
