// What the marketing email screens and the routes behind them pass to each
// other. No server code here: the screens import these too.

export type CampaignStatus = 'draft' | 'sending' | 'paused' | 'sent'

// Counted as people: someone who opened five times is one.
export type CampaignTotals = {
  recipients: number
  queued: number
  // Being sent to when the request was cut off: whether the message went
  // is not known.
  unconfirmed: number
  sent: number
  failed: number
  skipped: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
  unsubscribed: number
}

// Times are seconds since 1970.
export type Campaign = {
  id: number
  postId: number
  postUrl: string
  postTitle: string
  subject: string
  preheader: string
  status: CampaignStatus
  pauseReason: string
  createdAt: number
  startedAt: number | null
  finishedAt: number | null
  totals: CampaignTotals
}

export type RecipientStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'skipped'

export type RecipientRow = {
  id: number
  // null once the subscriber has been deleted.
  subscriberId: number | null
  email: string
  name: string
  status: RecipientStatus
  error: string
  sentAt: number | null
  deliveredAt: number | null
  bouncedAt: number | null
  bounceType: string
  complainedAt: number | null
  unsubscribedAt: number | null
  opens: number
  clicks: number
  lastEventAt: number | null
}

export type RecipientFilter =
  | 'all'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'unopened'
  | 'bounced'
  | 'unsubscribed'
  | 'complained'
  | 'failed'
  | 'skipped'
  | 'queued'

export type RecipientSort = 'name' | 'email' | 'status' | 'opens' | 'clicks' | 'activity'

// --- The mailing list ---

// pending: waiting for them to confirm. Only subscribed is ever sent a
// campaign; the rest are kept so the site remembers not to write to them.
export type SubscriberStatus = 'pending' | 'subscribed' | 'unsubscribed' | 'bounced' | 'complained'

export type SubscriberSource = 'signup' | 'member' | 'admin'

export type SubscriberRow = {
  id: number
  email: string
  firstName: string
  lastName: string
  status: SubscriberStatus
  source: SubscriberSource
  // The WordPress account, when it is a member's own subscription.
  userId: number | null
  createdAt: number
  confirmedAt: number | null
  unsubscribedAt: number | null
  lastOpenedAt: number | null
}

export type SubscriberStatusFilter = 'all' | SubscriberStatus

export type SubscriberSort = 'email' | 'name' | 'status' | 'added' | 'opened'

export type SubscriberCounts = Record<SubscriberStatusFilter, number>

// One line of a list an administrator adds.
export type NewSubscriber = { email: string; firstName?: string; lastName?: string }

// What adding a list would do, before anything is saved.
export type BulkCheck = {
  add: { email: string; firstName: string; lastName: string }[]
  subscribed: string[]
  pending: string[]
  // Unsubscribed, bounced or reported spam: never put back by a list.
  leftAlone: { email: string; status: SubscriberStatus }[]
  invalid: string[]
  duplicates: number
}

// One campaign a subscriber was sent.
export type SubscriberHistoryRow = {
  campaignId: number
  subject: string
  postTitle: string
  status: RecipientStatus
  sentAt: number | null
  delivered: boolean
  bounced: boolean
  opens: number
  clicks: number
  unsubscribed: boolean
  complained: boolean
}
