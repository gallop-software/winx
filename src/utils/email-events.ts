import { DateTime } from 'luxon'
import type { D1 } from '@/utils/d1'

// What Cloudflare says became of each message: delivered, deferred, bounced,
// failed, rejected, or marked as spam. Cloudflare puts these on a queue, and
// the Worker's queue handler in worker.ts hands each batch here.
//
// This file is also bundled outside Next.js, by that handler, so it imports
// nothing that only exists inside a request to the site.

const PREFIX = 'cf.email.sending.message.'

type EventType =
  | 'delivered'
  | 'deferred'
  | 'bounced'
  | 'failed'
  | 'rejected'
  | 'complained'

const TYPES = new Set<string>([
  'delivered',
  'deferred',
  'bounced',
  'failed',
  'rejected',
  'complained',
])

export type EmailEvent = {
  type?: string
  payload?: {
    eventId?: string
    messageId?: string
    recipient?: string
    bounce?: { type?: string; classification?: string; reason?: string }
    failure?: { reason?: string }
    rejection?: { reason?: string; detail?: string }
    complaint?: { type?: string }
  }
  metadata?: { eventTimestamp?: string }
}

// A message's id without the angle brackets some places write around it, so
// the id kept when it was sent and the id in an event are compared alike.
export function bareMessageId(id: string): string {
  return id.trim().replace(/^<|>$/g, '')
}

function secondsOf(iso: string | undefined): number {
  const time = iso ? DateTime.fromISO(iso) : null
  return Math.floor((time?.isValid ? time : DateTime.now()).toSeconds())
}

// Records one event. Returns false for one that is not about a message the
// site sent as a campaign, such as the contact form's, which is not an error.
//
// An event Cloudflare delivers twice is recorded once: its id is unique in
// email_events, and everything else is only done if that row went in.
export async function recordEmailEvent(db: D1, event: EmailEvent): Promise<boolean> {
  const type = event.type?.startsWith(PREFIX) ? event.type.slice(PREFIX.length) : ''
  const payload = event.payload
  if (!TYPES.has(type) || !payload?.messageId || !payload.eventId) return false

  const recipient = await db
    .prepare('SELECT id, campaign_id, email, subscriber_id FROM email_recipients WHERE message_id = ?1')
    .bind(bareMessageId(payload.messageId))
    .first<{ id: number; campaign_id: number; email: string; subscriber_id: number | null }>()
  if (!recipient) return false

  const time = secondsOf(event.metadata?.eventTimestamp)
  const inserted = await db
    .prepare(
      `INSERT INTO email_events (campaign_id, recipient_id, type, event_id, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT (event_id) DO NOTHING`
    )
    .bind(recipient.campaign_id, recipient.id, type, payload.eventId, time)
    .run()
  if (inserted.meta?.changes !== 1) return true

  const update = (set: string, ...values: unknown[]) =>
    db
      .prepare(
        `UPDATE email_recipients SET ${set},
            last_event_at = MAX(COALESCE(last_event_at, 0), ?2)
          WHERE id = ?1`
      )
      .bind(recipient.id, time, ...values)
  // The subscriber comes off the list. A spam report outranks anything; a
  // bounce does not undo an unsubscribe or a spam report.
  const suppress = (status: 'bounced' | 'complained') =>
    db
      .prepare(
        `UPDATE subscribers SET status = ?2, updated_at = ?3
          WHERE (id = ?1 OR (?1 IS NULL AND email = ?4))
            AND status IN (${status === 'complained' ? "'subscribed', 'pending', 'unsubscribed', 'bounced'" : "'subscribed', 'pending'"})`
      )
      .bind(recipient.subscriber_id, status, time, recipient.email)

  switch (type as EventType) {
    case 'delivered':
      await update('delivered_at = COALESCE(delivered_at, ?2)').run()
      break
    case 'deferred':
      // Still being tried. Nothing to mark until it is delivered or bounces.
      await update('error = ?3', payload.bounce?.reason ?? 'Deferred').run()
      break
    case 'bounced': {
      const hard = payload.bounce?.type === 'hard'
      const statements = [
        update(
          'bounced_at = COALESCE(bounced_at, ?2), bounce_type = ?3, error = ?4',
          payload.bounce?.type ?? '',
          (payload.bounce?.reason ?? '').slice(0, 300)
        ),
      ]
      // An address that does not exist is never written to again. A full
      // mailbox may have room next time.
      if (hard) statements.push(suppress('bounced'))
      await db.batch(statements)
      break
    }
    case 'failed':
    case 'rejected':
      await update(
        'bounced_at = COALESCE(bounced_at, ?2), bounce_type = ?3, error = ?4',
        type,
        (
          payload.rejection?.detail ??
          payload.rejection?.reason ??
          payload.failure?.reason ??
          ''
        ).slice(0, 300)
      ).run()
      break
    case 'complained':
      await db.batch([
        update('complained_at = COALESCE(complained_at, ?2)'),
        suppress('complained'),
      ])
      break
  }

  return true
}
