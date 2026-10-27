// The admin toolbar's demo: every route the toolbar's screens call, answered
// in the browser from made-up data, for a visitor who is not an
// administrator. Nothing here reads the real mailing list, the real visit
// log or any other private table; the only things asked of the server are
// the published posts (/api/posts, public) and, for the email preview and
// the one email the demo may send, /api/demo/email.
//
// The data is made up from a fixed seed, so it is the same on every visit
// and every page: the same subscribers, campaigns and visits, with the
// site's real posts as the ones sent and read. Changes to the mailing list
// are refused; a campaign can be made and "sent", which only moves its
// numbers.

import { DateTime } from 'luxon'
import type {
  BulkCheck,
  Campaign,
  CampaignTotals,
  NewSubscriber,
  RecipientFilter,
  RecipientRow,
  RecipientSort,
  SubscriberCounts,
  SubscriberHistoryRow,
  SubscriberRow,
  SubscriberSort,
  SubscriberStatus,
  SubscriberStatusFilter,
} from '@/utils/mailing-types'
import { flowTraceConfig } from '@/utils/flow-trace-config'
import { periodOf, periodRange } from '@/utils/flow-trace-periods'
import {
  FT_CONVERSIONS,
  type FtConversion,
  type FtCounts,
  type FtEvent,
  type FtListRow,
  type FtOverview,
  type FtSettings,
  type FtVisit,
  type FtVisitPage,
  type FtVisitReport,
} from '@/utils/flow-trace-types'
import type {
  LiveCounts,
  PageViewReport,
  ViewBucket,
  ViewCount,
  ViewListRow,
  ViewPeriod,
  VisitLogPage,
  VisitRow,
} from '@/utils/page-view-types'

const ZONE = 'America/Chicago'
const PER_PAGE = 50
// A short list each: the demo shows what the lists are, not a long tail.
const LIST_LENGTH = 5

export const DEMO_REFUSAL =
  'This is the demo: the mailing list cannot be changed here. Everything you see is made up.'

// --- Randomness, the same every time ---

function hash(...parts: (string | number)[]): number {
  let h = 2166136261
  for (const part of parts) {
    const text = String(part)
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    h ^= 0x9e3779b9
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

// A number from 0 to 1, fixed for its parts.
function chance(...parts: (string | number)[]): number {
  return hash(...parts) / 4294967296
}

function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// One of the choices, each as likely as its weight.
function weighted<T>(
  choices: readonly (readonly [T, number])[],
  roll: number
): T {
  const total = choices.reduce((sum, [, weight]) => sum + weight, 0)
  let left = roll * total
  for (const [value, weight] of choices) {
    left -= weight
    if (left < 0) return value
  }
  return choices[choices.length - 1]![0]
}

function pick<T>(list: readonly T[], roll: number): T {
  return list[Math.min(list.length - 1, Math.floor(roll * list.length))]!
}

// A page's path as the lists keep it: no slash at the end, except home's.
function pathKey(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

function now(): DateTime {
  return DateTime.now().setZone(ZONE)
}

function seconds(time: DateTime): number {
  return Math.floor(time.toSeconds())
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// --- The site's real posts ---

type DemoPost = {
  id: number
  url: string
  title: string
  date: DateTime
  categories: { name: string; slug: string }[]
  tags: { name: string; slug: string }[]
  // How well it is read, against the others.
  pull: number
}

let postsLoading: Promise<DemoPost[]> | null = null

function slugOf(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function loadPosts(): Promise<DemoPost[]> {
  try {
    const response = await fetch('/api/posts/?per_page=50&page=1')
    const json = (await response.json()) as {
      posts?: {
        id: number
        url: string
        metadata: {
          title: string
          date: string
          categories?: string[]
          categorySlugs?: string[]
          tags?: string[]
        }
      }[]
    }
    const posts = (json.posts ?? []).map((post) => {
      const names = post.metadata.categories ?? []
      const slugs = post.metadata.categorySlugs ?? []
      return {
        id: post.id,
        url: post.url.replace(/\/$/, ''),
        title: post.metadata.title,
        date: DateTime.fromISO(post.metadata.date, { zone: ZONE }),
        categories: names.map((name, i) => ({
          name,
          slug: slugs[i] ?? slugOf(name),
        })),
        tags: (post.metadata.tags ?? []).map((name) => ({
          name,
          slug: slugOf(name),
        })),
        pull: 0.35 + chance('pull', post.id) ** 2 * 2.4,
      }
    })
    if (posts.length) return posts.filter((post) => post.date.isValid)
  } catch {
    // Falls through to the stand-ins.
  }
  // Only if the site has no posts to show: stand-ins, so the screens are
  // not empty.
  return [
    'The first ten hires',
    'Pricing is a product decision',
    'What a board is for',
  ].map((title, i) => ({
    id: 9000 + i,
    url: `/${now()
      .minus({ days: 20 + i * 30 })
      .toFormat('yyyy/MM')}/${slugOf(title)}`,
    title,
    date: now().minus({ days: 20 + i * 30 }),
    categories: [{ name: 'Leadership', slug: 'leadership' }],
    tags: [],
    pull: 1,
  }))
}

function posts(): Promise<DemoPost[]> {
  postsLoading ??= loadPosts()
  return postsLoading
}

// --- People ---

const FIRST_NAMES = [
  'James',
  'Olivia',
  'Liam',
  'Emma',
  'Noah',
  'Ava',
  'Ethan',
  'Sophia',
  'Lucas',
  'Mia',
  'Mason',
  'Isabella',
  'Logan',
  'Amelia',
  'Elijah',
  'Harper',
  'Aiden',
  'Evelyn',
  'Caleb',
  'Abigail',
  'Daniel',
  'Emily',
  'Henry',
  'Ella',
  'Samuel',
  'Grace',
  'David',
  'Chloe',
  'Joseph',
  'Lily',
  'Michael',
  'Hannah',
  'Benjamin',
  'Zoe',
  'Jack',
  'Nora',
  'Owen',
  'Riley',
  'Wyatt',
  'Leah',
  'Ryan',
  'Aria',
  'Nathan',
  'Layla',
  'Isaac',
  'Claire',
  'Andrew',
  'Stella',
  'Thomas',
  'Maya',
  'Priya',
  'Arjun',
  'Ananya',
  'Rohan',
  'Kavya',
  'Vikram',
  'Neha',
  'Rahul',
  'Aisha',
  'Omar',
  'Fatima',
  'Yusuf',
  'Layla',
  'Hassan',
  'Mei',
  'Wei',
  'Jun',
  'Hana',
  'Kenji',
  'Yuki',
  'Hiroshi',
  'Sakura',
  'Min-jun',
  'Seo-yeon',
  'Ji-ho',
  'Lucía',
  'Mateo',
  'Sofía',
  'Diego',
  'Valentina',
  'Javier',
  'Camila',
  'Carlos',
  'Gabriela',
  'Pedro',
  'Mariana',
  'Luca',
  'Giulia',
  'Marco',
  'Chiara',
  'Lukas',
  'Lena',
  'Felix',
  'Hannah',
  'Jonas',
  'Anna',
  'Elias',
  'Freya',
  'Oscar',
  'Ingrid',
  'Pierre',
  'Camille',
  'Louis',
  'Chloé',
  'Hugo',
  'Inès',
  'Sean',
  'Siobhan',
  'Ciaran',
  'Niamh',
  'Kwame',
  'Ama',
  'Chidi',
  'Ngozi',
  'Tunde',
  'Zainab',
  'Tomás',
  'Joana',
  'Nikolai',
  'Anastasia',
  'Rachel',
  'Sarah',
  'Jessica',
  'Lauren',
  'Megan',
  'Jordan',
  'Taylor',
  'Morgan',
  'Alex',
  'Sam',
]

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
  'Patel',
  'Shah',
  'Sharma',
  'Gupta',
  'Iyer',
  'Reddy',
  'Mehta',
  'Kapoor',
  'Khan',
  'Ahmed',
  'Ali',
  'Hussain',
  'Chen',
  'Wang',
  'Li',
  'Zhang',
  'Liu',
  'Huang',
  'Tanaka',
  'Suzuki',
  'Sato',
  'Watanabe',
  'Kim',
  'Park',
  'Choi',
  'Müller',
  'Schmidt',
  'Schneider',
  'Fischer',
  'Weber',
  'Becker',
  'Hoffmann',
  'Rossi',
  'Russo',
  'Ferrari',
  'Bianchi',
  'Romano',
  'Dubois',
  'Laurent',
  'Moreau',
  'Bernard',
  'Fontaine',
  'Silva',
  'Santos',
  'Oliveira',
  'Costa',
  'Pereira',
  'Novak',
  'Kowalski',
  'Nowak',
  'Andersson',
  'Johansson',
  'Larsen',
  'Nielsen',
  'Hansen',
  'Berg',
  'Murphy',
  "O'Brien",
  'Kelly',
  'Walsh',
  'Okafor',
  'Mensah',
  'Adeyemi',
  'Owusu',
  'Cohen',
  'Levy',
  'Friedman',
  'Ivanov',
  'Petrov',
  'Bennett',
  'Brooks',
  'Price',
  'Hughes',
  'Foster',
  'Sullivan',
  'Russell',
  'Fisher',
  'Hayes',
  'Myers',
  'Ford',
]

// Where the made-up addresses are: the big free inboxes, and work domains
// that are invented for the demo.
const MAIL_DOMAINS = [
  ['gmail.com', 44],
  ['outlook.com', 6],
  ['hotmail.com', 4],
  ['icloud.com', 8],
  ['yahoo.com', 5],
  ['proton.me', 3],
  ['me.com', 1],
  ['hey.com', 1],
  ['fastmail.com', 1],
  ['work', 27],
] as const

const WORK_DOMAINS = [
  'northwindlabs.io',
  'brightpath.co',
  'lumenworks.com',
  'copperline.vc',
  'tidewaterhq.com',
  'fieldnote.app',
  'harborpoint.io',
  'quillstack.com',
  'meridianops.co',
  'saltandpine.studio',
  'parallaxhealth.com',
  'stonebridgecap.com',
  'orbitpay.io',
  'greenlightventures.co',
  'kitecloud.dev',
  'ledgerlane.com',
  'foundryline.io',
  'tallgrass.ai',
  'bluecedar.co',
  'wavelengthlabs.com',
  'ironwoodpartners.com',
  'mosaichq.io',
  'atlasrevenue.com',
  'cobaltsecurity.io',
  'pinecrest.health',
  'sparrowrobotics.com',
  'evergrid.energy',
  'riverstone.vc',
  'helixbio.co',
  'canopyhr.com',
]

type Person = {
  id: number
  email: string
  firstName: string
  lastName: string
  status: SubscriberStatus
  source: SubscriberRow['source']
  userId: number | null
  createdAt: number
  confirmedAt: number | null
  unsubscribedAt: number | null
  // When they left the list, whatever the reason: they are sent nothing after.
  leftAt: number | null
  // How likely they are to open an email, and to click once they have.
  opens: number
  clicks: number
}

type Sent = {
  id: number
  post: DemoPost
  subject: string
  preheader: string
  at: number
  // Sent only to those who had not opened the first one.
  resendOf: number | null
}

type World = {
  posts: DemoPost[]
  people: Person[]
  byId: Map<number, Person>
  sent: Sent[]
  // Analytics: when the site started counting.
  launch: DateTime
}

let worldLoading: Promise<World> | null = null

function emailOf(
  first: string,
  last: string,
  roll: () => number,
  used: Set<string>
): string {
  const plain = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '')
  const f = plain(first)
  const l = plain(last)
  const domainKind = weighted(MAIL_DOMAINS, roll())
  const work = domainKind === 'work'
  const domain = work ? pick(WORK_DOMAINS, roll()) : domainKind
  const year = String(60 + Math.floor(roll() * 45)).slice(-2)
  const shapes = work
    ? [`${f}`, `${f}.${l}`, `${f[0]}${l}`, `${f}${l[0]}`]
    : [
        `${f}.${l}`,
        `${f}${l}`,
        `${f}.${l}${year}`,
        `${f[0]}${l}`,
        `${f}_${l}`,
        `${f}${year}`,
        `${l}.${f}`,
      ]
  let local = pick(shapes, roll())
  for (let n = 2; used.has(`${local}@${domain}`); n++)
    local = `${pick(shapes, roll())}${n}`
  const email = `${local}@${domain}`
  used.add(email)
  return email
}

async function world(): Promise<World> {
  worldLoading ??= build()
  return worldLoading
}

// The day the made-up site began. Fixed, so every past day keeps its
// numbers and its subscribers from one visit to the next: tomorrow is today
// with one more day added, never a different history.
const LAUNCH = DateTime.fromISO('2024-03-01', { zone: ZONE })

async function build(): Promise<World> {
  const all = (await posts())
    .slice()
    .sort((a, b) => a.date.toMillis() - b.date.toMillis())
  const today = now()

  // One sent campaign per post, the morning after it went up. Its id comes
  // from the post's, so a new post adds a campaign and moves no other.
  const sent: Sent[] = []
  for (const post of all) {
    const at = post.date
      .plus({ days: 1 })
      .set({ hour: 7, minute: 30 + Math.floor(chance('at', post.id) * 25) })
    if (at > today) continue
    sent.push({
      id: 100 + post.id * 3,
      post,
      subject: post.title,
      preheader: '',
      at: seconds(at),
      resendOf: null,
    })
    // Now and then a second send, four days on, to those who did not open.
    const again = at.plus({ days: 4, hours: 1 })
    if (chance('resend', post.id) < 0.2 && again < today) {
      sent.push({
        id: 100 + post.id * 3 + 1,
        post,
        subject: `In case you missed it: ${post.title}`,
        preheader: '',
        at: seconds(again),
        resendOf: 100 + post.id * 3,
      })
    }
  }
  sent.sort((a, b) => a.at - b.at)
  const sendTimes = sent.map((one) => one.at)
  const end = seconds(today)

  // Each day's sign-ups, from that day's own seed: slowly at first, faster
  // as the site grew, more on weekdays and in the days after a post.
  const used = new Set<string>()
  const people: Person[] = []
  let id = 0
  for (let day = LAUNCH; day <= today; day = day.plus({ days: 1 })) {
    const key = dayKey(day)
    const roll = seeded(hash('signups', key))
    const age = day.diff(LAUNCH, 'days').days
    let rate =
      (0.15 + 1.1 * Math.pow(age / 960, 1.5)) * VIEW_WEEKDAYS[day.weekday - 1]!
    for (const post of all) {
      const after = day.diff(post.date.startOf('day'), 'days').days
      if (after >= 0 && after < 3) rate += [1.2, 0.6, 0.2][after]! * post.pull
    }
    if (chance('viral', key) < 0.012) rate *= 3
    const count = Math.round(rate * (0.55 + roll() * 0.9))

    for (let n = 0; n < count; n++) {
      id++
      const first = pick(FIRST_NAMES, roll())
      const last = pick(LAST_NAMES, roll())
      const email = emailOf(first, last, roll, used)
      const createdAt = seconds(day) + Math.floor(roll() * 86400)
      const source = weighted(
        [
          ['signup', 80],
          ['member', 13],
          ['admin', 7],
        ] as const,
        roll()
      )
      const named = roll()
      const kind = weighted(
        [
          ['stays', 86],
          ['unsubscribed', 7],
          ['bounced', 2.8],
          ['complained', 0.35],
          ['never-confirms', 3],
        ] as const,
        roll()
      )
      const confirmDelay = Math.floor(60 + roll() * 7200)
      // How long until they leave, if they do: a bounce comes with the
      // first email or two, the rest drift off over months.
      const stay =
        -Math.log(1 - roll()) * (kind === 'bounced' ? 20 : 300) * 86400
      const opens = Math.min(0.97, 0.12 + roll() ** 0.7 * 0.85)
      const clicks = 0.05 + roll() ** 2 * 0.35
      const leaveDelay =
        kind === 'bounced' ? 40 : Math.floor(600 + roll() * 3 * 86400)
      // Every draw is made whatever happens below, so each person takes the
      // same share of the day's seed and nobody after them changes.
      // Today's later sign-ups have not happened yet. Their seeds are still
      // drawn above, so everyone before them keeps their own.
      if (createdAt > end) continue

      const pending = kind === 'never-confirms' && source === 'signup'
      const confirmedAt = pending ? null : createdAt + confirmDelay
      let status: SubscriberStatus = pending ? 'pending' : 'subscribed'
      let leftAt: number | null = null
      if (confirmedAt && kind !== 'stays' && kind !== 'never-confirms') {
        // They leave when an email reaches them, the first one after their
        // time is up, and not before it has been sent.
        const sentAt = sendTimes.find((time) => time > confirmedAt + stay)
        const left = sentAt === undefined ? null : sentAt + leaveDelay
        if (left !== null && left <= end) {
          leftAt = left
          status = kind
        }
      }

      people.push({
        id,
        email,
        firstName: named < 0.06 ? '' : first,
        lastName: named < 0.2 ? '' : last,
        status,
        source,
        userId: source === 'member' ? 40 + id : null,
        createdAt,
        confirmedAt,
        unsubscribedAt:
          status === 'unsubscribed' || status === 'complained' ? leftAt : null,
        leftAt,
        opens,
        clicks,
      })
    }
  }

  return {
    posts: all,
    people,
    byId: new Map(people.map((p) => [p.id, p])),
    sent,
    launch: LAUNCH,
  }
}

// --- Campaigns ---

// Who a sent campaign went to: subscribed when it went out.
function audienceOf(w: World, one: Sent): Person[] {
  const first =
    one.resendOf === null ? null : w.sent.find((s) => s.id === one.resendOf)
  return w.people.filter((person) => {
    if (!person.confirmedAt || person.confirmedAt > one.at - 600) return false
    if (person.leftAt !== null && person.leftAt < one.at) return false
    if (first) {
      // Only those the first send reached, who did not open it.
      if (person.confirmedAt > first.at - 600) return false
      const before = recipientOf(first, person)
      return (
        before.opens === 0 &&
        before.status === 'sent' &&
        !before.bouncedAt &&
        !before.unsubscribedAt
      )
    }
    return true
  })
}

const recipientCache = new Map<string, RecipientRow>()

// What one person did with one email, the same every time it is asked.
function recipientOf(one: Sent, person: Person): RecipientRow {
  const key = `${one.id}|${person.id}`
  const known = recipientCache.get(key)
  if (known) return known

  const r = (what: string) => chance(what, one.id, person.id)
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ')
  const sentAt = one.at + Math.floor(r('sent') * 2400)
  const base: RecipientRow = {
    id: one.id * 10000 + person.id,
    subscriberId: person.id,
    email: person.email,
    name,
    status: 'sent',
    error: '',
    sentAt,
    deliveredAt: null,
    bouncedAt: null,
    bounceType: '',
    complainedAt: null,
    unsubscribedAt: null,
    opens: 0,
    clicks: 0,
    lastEventAt: sentAt,
  }

  const leavesHere =
    person.leftAt !== null &&
    person.leftAt >= one.at &&
    person.leftAt < one.at + 5 * 86400
  if (leavesHere && person.status === 'bounced') {
    base.bouncedAt = sentAt + 30
    base.bounceType = r('bt') < 0.82 ? 'hard' : 'soft'
    base.lastEventAt = base.bouncedAt
  } else if (r('fail') < 0.0009) {
    base.status = 'failed'
    base.error =
      'E_RECIPIENT_SUPPRESSED The address is on Cloudflare’s suppression list.'
    base.sentAt = null
    base.lastEventAt = null
  } else {
    base.deliveredAt = sentAt + 2 + Math.floor(r('dl') * 50)
    base.lastEventAt = base.deliveredAt
    // Fewer open a second send, and the newest have not all opened yet.
    const age = (seconds(now()) - one.at) / 86400
    const settled = Math.min(1, 0.35 + age / 3)
    const likely = person.opens * (one.resendOf ? 0.32 : 1) * settled
    if (r('open') < likely) {
      const opened =
        base.deliveredAt + Math.floor(300 + r('ot') ** 3 * 4 * 86400)
      base.opens = 1 + Math.floor(r('oc') ** 2.2 * 6)
      base.lastEventAt =
        opened + Math.floor(r('lo') * 86400 * (base.opens - 1) * 0.4)
      if (r('click') < person.clicks) {
        base.clicks = 1 + Math.floor(r('cc') ** 3 * 4)
        base.lastEventAt += Math.floor(60 + r('ct') * 1200)
      }
    }
    if (leavesHere && person.status === 'complained') {
      base.complainedAt = (base.lastEventAt ?? sentAt) + 600
      base.unsubscribedAt = base.complainedAt
      base.lastEventAt = base.complainedAt
    } else if (
      leavesHere &&
      person.status === 'unsubscribed' &&
      r('unsub-here') < 0.78
    ) {
      base.unsubscribedAt =
        Math.max(base.lastEventAt ?? sentAt, sentAt) +
        Math.floor(120 + r('ut') * 3600)
      base.lastEventAt = base.unsubscribedAt
    }
  }

  recipientCache.set(key, base)
  return base
}

function totalsOf(rows: RecipientRow[]): CampaignTotals {
  const count = (test: (row: RecipientRow) => boolean) =>
    rows.filter(test).length
  return {
    recipients: rows.length,
    queued: count((row) => row.status === 'queued'),
    unconfirmed: count((row) => row.status === 'sending'),
    sent: count((row) => row.status === 'sent'),
    failed: count((row) => row.status === 'failed'),
    skipped: count((row) => row.status === 'skipped'),
    delivered: count((row) => row.deliveredAt !== null),
    opened: count((row) => row.opens > 0),
    clicked: count((row) => row.clicks > 0),
    bounced: count((row) => row.bouncedAt !== null),
    complained: count((row) => row.complainedAt !== null),
    unsubscribed: count((row) => row.unsubscribedAt !== null),
  }
}

const rowsCache = new Map<number, RecipientRow[]>()

function sentRows(w: World, one: Sent): RecipientRow[] {
  const known = rowsCache.get(one.id)
  if (known) return known
  const rows = audienceOf(w, one).map((person) => recipientOf(one, person))
  rowsCache.set(one.id, rows)
  return rows
}

// One of the last few campaigns sent before a moment, for a visit that came
// from the newsletter, or none when nothing had been sent yet.
function sentBefore(w: World, at: number, roll: number): Sent | undefined {
  const before = w.sent.filter((one) => one.at < at)
  return before[before.length - 1 - Math.floor(roll * Math.min(3, before.length))]
}

function campaignOf(w: World, one: Sent): Campaign {
  const rows = sentRows(w, one)
  const last = Math.max(...rows.map((row) => row.sentAt ?? 0), one.at)
  return {
    id: one.id,
    postId: one.post.id,
    postUrl: one.post.url,
    postTitle: one.post.title,
    subject: one.subject,
    preheader: one.preheader,
    status: 'sent',
    pauseReason: '',
    createdAt: one.at - 1800,
    startedAt: one.at,
    finishedAt: last,
    totals: totalsOf(rows),
  }
}

// Campaigns made in this visit, which "send" by moving their numbers.
type Made = { campaign: Campaign; rows: RecipientRow[] }
const made = new Map<number, Made>()
let nextMadeId = 90000

function madeCampaign(id: number): Made | undefined {
  return made.get(id)
}

function refreshTotals(entry: Made) {
  entry.campaign = { ...entry.campaign, totals: totalsOf(entry.rows) }
}

// --- Subscribers ---

// Who each sent campaign went to, by subscriber id.
const sentTo = new Map<number, Set<number>>()

function wasSent(w: World, one: Sent, person: Person): boolean {
  let ids = sentTo.get(one.id)
  if (!ids) {
    ids = new Set(sentRows(w, one).map((row) => row.subscriberId ?? 0))
    sentTo.set(one.id, ids)
  }
  return ids.has(person.id)
}

function subscriberRow(w: World, person: Person): SubscriberRow {
  let lastOpenedAt: number | null = null
  for (const one of w.sent) {
    if (!wasSent(w, one, person)) continue
    const row = recipientOf(one, person)
    if (row.opens > 0) {
      const opened = (row.deliveredAt ?? one.at) + 600
      lastOpenedAt = Math.max(lastOpenedAt ?? 0, opened)
    }
  }
  return {
    id: person.id,
    email: person.email,
    firstName: person.firstName,
    lastName: person.lastName,
    status: person.status,
    source: person.source,
    userId: person.userId,
    createdAt: person.createdAt,
    confirmedAt: person.confirmedAt,
    unsubscribedAt: person.unsubscribedAt,
    lastOpenedAt,
  }
}

let subscriberRows: SubscriberRow[] | null = null

function allSubscribers(w: World): SubscriberRow[] {
  subscriberRows ??= w.people.map((person) => subscriberRow(w, person))
  return subscriberRows
}

function matches(
  row: { email: string; firstName: string; lastName: string },
  search: string
) {
  if (!search) return true
  const text = search.trim().toLowerCase()
  return (
    row.email.toLowerCase().includes(text) ||
    `${row.firstName} ${row.lastName}`.toLowerCase().includes(text)
  )
}

function subscriberCounts(rows: SubscriberRow[]): SubscriberCounts {
  const counts: SubscriberCounts = {
    all: rows.length,
    subscribed: 0,
    pending: 0,
    unsubscribed: 0,
    bounced: 0,
    complained: 0,
  }
  for (const row of rows) counts[row.status]++
  return counts
}

// Blanks last whichever way the list is sorted, as the database puts them.
function compare(
  a: string | number | null,
  b: string | number | null,
  descending: boolean
): number {
  if (a === b) return 0
  if (a === null || a === '') return 1
  if (b === null || b === '') return -1
  const order =
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
  return descending ? -order : order
}

function listSubscribers(w: World, params: URLSearchParams) {
  const status = (params.get('status') ?? 'all') as SubscriberStatusFilter
  const search = params.get('search') ?? ''
  const sort = (params.get('sort') ?? 'added') as SubscriberSort
  const descending = params.get('dir') !== 'asc'
  const page = Math.max(1, Number(params.get('page')) || 1)

  const searched = allSubscribers(w).filter((row) => matches(row, search))
  const counts = subscriberCounts(searched)
  const value = (row: SubscriberRow): string | number | null =>
    sort === 'email'
      ? row.email
      : sort === 'name'
        ? `${row.firstName} ${row.lastName}`.trim()
        : sort === 'status'
          ? row.status
          : sort === 'opened'
            ? row.lastOpenedAt
            : row.createdAt
  const rows = searched
    .filter((row) => status === 'all' || row.status === status)
    .sort((a, b) => {
      return compare(value(a), value(b), descending) || b.id - a.id
    })
  return {
    rows: rows.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    total: rows.length,
    counts,
    perPage: PER_PAGE,
  }
}

function historyOf(w: World, id: number): SubscriberHistoryRow[] {
  const person = w.byId.get(id)
  if (!person) return []
  const rows: SubscriberHistoryRow[] = []
  for (const one of w.sent) {
    const row = sentRows(w, one).find((r) => r.subscriberId === id)
    if (!row) continue
    rows.push({
      campaignId: one.id,
      subject: one.subject,
      postTitle: one.post.title,
      status: row.status,
      sentAt: row.sentAt,
      delivered: row.deliveredAt !== null,
      bounced: row.bouncedAt !== null,
      opens: row.opens,
      clicks: row.clicks,
      unsubscribed: row.unsubscribedAt !== null,
      complained: row.complainedAt !== null,
    })
  }
  return rows.sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))
}

function checkList(w: World, list: NewSubscriber[]): BulkCheck {
  const byEmail = new Map(
    allSubscribers(w).map((row) => [row.email.toLowerCase(), row])
  )
  const seen = new Set<string>()
  const check: BulkCheck = {
    add: [],
    subscribed: [],
    pending: [],
    leftAlone: [],
    invalid: [],
    duplicates: 0,
  }
  for (const item of list) {
    const email = item.email.trim().toLowerCase()
    if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email)) {
      if (email) check.invalid.push(item.email)
      continue
    }
    if (seen.has(email)) {
      check.duplicates++
      continue
    }
    seen.add(email)
    const known = byEmail.get(email)
    if (!known) {
      check.add.push({
        email,
        firstName: item.firstName ?? '',
        lastName: item.lastName ?? '',
      })
    } else if (known.status === 'subscribed') check.subscribed.push(email)
    else if (known.status === 'pending') check.pending.push(email)
    else check.leftAlone.push({ email, status: known.status })
  }
  return check
}

// The list as a CSV file, as the real export gives it.
export async function demoSubscribersCsv(
  filter: Record<string, string>
): Promise<string> {
  const w = await world()
  const status = (filter.status ?? 'all') as SubscriberStatusFilter
  const rows = allSubscribers(w).filter(
    (row) =>
      (status === 'all' || row.status === status) &&
      matches(row, filter.search ?? '')
  )
  const time = (value: number | null) =>
    value
      ? DateTime.fromSeconds(value, { zone: ZONE }).toFormat('yyyy-MM-dd HH:mm')
      : ''
  const cell = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  const lines = [
    'email,first_name,last_name,status,source,added,confirmed,unsubscribed,last_opened',
    ...rows.map((row) =>
      [
        row.email,
        row.firstName,
        row.lastName,
        row.status,
        row.source,
        time(row.createdAt),
        time(row.confirmedAt),
        time(row.unsubscribedAt),
        time(row.lastOpenedAt),
      ]
        .map(cell)
        .join(',')
    ),
  ]
  return lines.join('\n')
}

// --- Reports ---

const RECIPIENT_FILTERS: Record<
  RecipientFilter,
  (row: RecipientRow) => boolean
> = {
  all: () => true,
  delivered: (row) => row.deliveredAt !== null,
  opened: (row) => row.opens > 0,
  clicked: (row) => row.clicks > 0,
  unopened: (row) => row.status === 'sent' && row.opens === 0,
  bounced: (row) => row.bouncedAt !== null,
  unsubscribed: (row) => row.unsubscribedAt !== null,
  complained: (row) => row.complainedAt !== null,
  failed: (row) => row.status === 'failed' || row.status === 'sending',
  skipped: (row) => row.status === 'skipped',
  queued: (row) => row.status === 'queued',
}

function reportOf(
  campaign: Campaign,
  all: RecipientRow[],
  params: URLSearchParams
) {
  const filter = (params.get('filter') ?? 'all') as RecipientFilter
  const search = (params.get('search') ?? '').trim().toLowerCase()
  const sort = (params.get('sort') ?? 'activity') as RecipientSort
  const descending = params.get('dir') !== 'asc'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const value = (row: RecipientRow): string | number | null =>
    sort === 'name'
      ? row.name
      : sort === 'email'
        ? row.email
        : sort === 'status'
          ? row.status
          : sort === 'opens'
            ? row.opens
            : sort === 'clicks'
              ? row.clicks
              : row.lastEventAt
  const rows = all
    .filter(RECIPIENT_FILTERS[filter] ?? RECIPIENT_FILTERS.all)
    .filter(
      (row) =>
        !search ||
        row.email.includes(search) ||
        row.name.toLowerCase().includes(search)
    )
    .sort((a, b) => {
      return compare(value(a), value(b), descending) || a.id - b.id
    })
  return {
    campaign,
    rows: rows.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    total: rows.length,
    perPage: PER_PAGE,
  }
}

// --- Page views ---

const STATIC_PAGES: [string, string, number][] = [
  ['/', 'Home', 2.6],
  ['/essays', 'All Essays', 0.55],
  ['/about', 'About', 0.42],
  ['/contact', 'Contact', 0.12],
  ['/account', 'Account', 0.05],
]

const REFERRERS = [
  ['google.com', 34],
  ['t.co', 9],
  ['linkedin.com', 8.5],
  ['news.ycombinator.com', 5],
  ['mail.google.com', 4.2],
  ['bing.com', 2.4],
  ['duckduckgo.com', 2.1],
  ['reddit.com', 2.3],
  ['lnkd.in', 1.6],
  ['chatgpt.com', 1.9],
  ['perplexity.ai', 0.8],
  ['com.google.android.gm', 0.9],
  ['outlook.live.com', 0.7],
  ['facebook.com', 0.6],
  ['bsky.app', 0.7],
  ['google.co.uk', 1.1],
  ['google.ca', 0.7],
  ['google.de', 0.5],
  ['google.co.in', 0.6],
  ['com.google.android.googlequicksearchbox', 0.9],
  ['search.brave.com', 0.35],
  ['ecosia.org', 0.2],
  ['substack.com', 0.5],
  ['feedly.com', 0.45],
  ['getpocket.com', 0.2],
  ['indiehackers.com', 0.4],
  ['producthunt.com', 0.3],
  ['youtube.com', 0.25],
  ['instagram.com', 0.2],
  ['kagi.com', 0.15],
  ['claude.ai', 0.3],
] as const

const COUNTRIES = [
  ['US', 46],
  ['GB', 9],
  ['CA', 7],
  ['IN', 6.5],
  ['DE', 4],
  ['AU', 3.4],
  ['NL', 2.1],
  ['FR', 2],
  ['SG', 1.6],
  ['SE', 1.3],
  ['BR', 1.4],
  ['IE', 1.1],
  ['ES', 1.1],
  ['IL', 0.9],
  ['CH', 0.8],
  ['NG', 0.8],
  ['PH', 0.7],
  ['MX', 0.7],
  ['JP', 0.6],
  ['PL', 0.6],
  ['KE', 0.5],
  ['AE', 0.5],
  ['ZA', 0.5],
  ['NZ', 0.5],
  ['DK', 0.4],
  ['PT', 0.4],
  ['IT', 0.5],
  ['FI', 0.3],
  ['KR', 0.3],
  ['NO', 0.3],
] as const

// Regions and cities, for the countries most visitors come from.
const PLACES: Record<string, [string, string[], number][]> = {
  US: [
    [
      'California',
      [
        'San Francisco',
        'Los Angeles',
        'San Jose',
        'Palo Alto',
        'Oakland',
        'San Diego',
      ],
      22,
    ],
    ['New York', ['New York', 'Brooklyn', 'Buffalo'], 13],
    ['Texas', ['Austin', 'Dallas', 'Houston', 'San Antonio'], 10],
    ['Washington', ['Seattle', 'Bellevue', 'Redmond'], 6],
    ['Massachusetts', ['Boston', 'Cambridge', 'Somerville'], 5],
    ['Illinois', ['Chicago', 'Evanston'], 4.5],
    ['Colorado', ['Denver', 'Boulder'], 3.5],
    ['Florida', ['Miami', 'Tampa', 'Orlando'], 4],
    ['Georgia', ['Atlanta'], 2.6],
    ['Virginia', ['Arlington', 'Reston'], 2.2],
    ['Utah', ['Salt Lake City', 'Lehi'], 1.8],
    ['Oregon', ['Portland'], 1.8],
    ['North Carolina', ['Raleigh', 'Durham', 'Charlotte'], 2.2],
    ['Pennsylvania', ['Philadelphia', 'Pittsburgh'], 2.1],
    ['Minnesota', ['Minneapolis'], 1.3],
    ['Missouri', ['St. Louis', 'Kansas City'], 1.0],
  ],
  GB: [
    [
      'England',
      ['London', 'Manchester', 'Bristol', 'Cambridge', 'Oxford', 'Leeds'],
      85,
    ],
    ['Scotland', ['Edinburgh', 'Glasgow'], 10],
    ['Wales', ['Cardiff'], 3],
  ],
  CA: [
    ['Ontario', ['Toronto', 'Ottawa', 'Waterloo'], 50],
    ['British Columbia', ['Vancouver', 'Victoria'], 25],
    ['Quebec', ['Montreal'], 15],
    ['Alberta', ['Calgary', 'Edmonton'], 10],
  ],
  IN: [
    ['Karnataka', ['Bengaluru'], 40],
    ['Maharashtra', ['Mumbai', 'Pune'], 25],
    ['Delhi', ['New Delhi'], 15],
    ['Telangana', ['Hyderabad'], 12],
    ['Tamil Nadu', ['Chennai'], 8],
  ],
  DE: [
    ['Berlin', ['Berlin'], 40],
    ['Bavaria', ['Munich'], 25],
    ['Hamburg', ['Hamburg'], 15],
    ['Hesse', ['Frankfurt am Main'], 10],
  ],
  AU: [
    ['New South Wales', ['Sydney'], 50],
    ['Victoria', ['Melbourne'], 38],
    ['Queensland', ['Brisbane'], 12],
  ],
  NL: [
    ['North Holland', ['Amsterdam'], 70],
    ['South Holland', ['Rotterdam', 'The Hague'], 30],
  ],
  FR: [
    ['Île-de-France', ['Paris'], 80],
    ['Auvergne-Rhône-Alpes', ['Lyon'], 20],
  ],
  SG: [['Singapore', ['Singapore'], 100]],
  SE: [
    ['Stockholm County', ['Stockholm'], 80],
    ['Västra Götaland', ['Gothenburg'], 20],
  ],
}

const DEVICES = [
  ['Chrome', 'macOS', 'desktop', 24],
  ['Safari', 'iOS', 'mobile', 21],
  ['Chrome', 'Windows', 'desktop', 13],
  ['Chrome', 'Android', 'mobile', 10],
  ['Safari', 'macOS', 'desktop', 9],
  ['Edge', 'Windows', 'desktop', 4.5],
  ['Firefox', 'macOS', 'desktop', 2.6],
  ['Firefox', 'Windows', 'desktop', 2.4],
  ['Safari', 'iOS', 'tablet', 2.3],
  ['Chrome', 'Linux', 'desktop', 1.9],
  ['Samsung Internet', 'Android', 'mobile', 1.6],
  ['Chrome', 'ChromeOS', 'desktop', 0.9],
  ['Firefox', 'Linux', 'desktop', 0.8],
  ['Chrome', 'iOS', 'mobile', 1.5],
  ['Opera', 'Windows', 'desktop', 0.4],
  ['Chrome', 'Android', 'tablet', 0.5],
  ['Edge', 'macOS', 'desktop', 0.5],
] as const

const VIEW_WEEKDAYS = [1.12, 1.16, 1.1, 1.04, 0.93, 0.72, 0.78] // Monday first
// The share of a day's views in each hour, by the site's clock.
const HOUR_SHAPE = [
  1.4, 1.0, 0.8, 0.7, 0.8, 1.3, 2.4, 3.6, 5.0, 6.0, 6.3, 6.0, 5.6, 5.8, 6.0,
  5.7, 5.1, 4.6, 4.3, 4.6, 5.0, 4.6, 3.3, 2.2,
]
const HOUR_TOTAL = HOUR_SHAPE.reduce((a, b) => a + b, 0)

function dayKey(day: DateTime) {
  return day.toFormat('yyyy-MM-dd')
}

const dayCache = new Map<string, ViewCount>()

// The site's views on one day: a steady climb, quieter weekends, a lift for
// a few days after each post and its email, and now and then a day a post
// is passed around.
function siteDay(w: World, day: DateTime): ViewCount {
  const key = dayKey(day)
  const known = dayCache.get(key)
  if (known) return known
  if (day < w.launch) return { views: 0, visits: 0, visitors: 0 }

  const months = day.diff(w.launch, 'months').months
  const trend = 12 + months * 4 + Math.pow(Math.max(0, months), 1.55) * 0.5
  let level = trend * VIEW_WEEKDAYS[day.weekday - 1]!
  for (const post of w.posts) {
    const after = day.startOf('day').diff(post.date.startOf('day'), 'days').days
    if (after >= 0 && after < 6)
      level += trend * post.pull * [2.4, 2.9, 1.3, 0.6, 0.3, 0.15][after]!
  }
  if (chance('viral', key) < 0.012) level *= 2 + chance('viral-size', key) * 3
  level *= 0.86 + chance('noise', key) * 0.28

  const views = Math.round(level)
  const visits = Math.round(views * (0.6 + chance('v', key) * 0.08))
  const visitors = Math.round(visits * (0.84 + chance('u', key) * 0.08))
  const count = { views, visits, visitors }
  dayCache.set(key, count)
  return count
}

function scaled(count: ViewCount, share: number): ViewCount {
  return {
    views: Math.round(count.views * share),
    visits: Math.round(count.visits * share),
    visitors: Math.round(count.visitors * share),
  }
}

function summed(counts: ViewCount[]): ViewCount {
  return counts.reduce(
    (sum, c) => ({
      views: sum.views + c.views,
      visits: sum.visits + c.visits,
      visitors: sum.visitors + c.visitors,
    }),
    { views: 0, visits: 0, visitors: 0 }
  )
}

// One page's share of the site's views, from its pull and its age.
type Page = {
  path: string
  title: string
  weight: (day: DateTime) => number
  archive: boolean
}

// A day as a whole number, in the site's own time: cheap to compare, where
// a Luxon diff on every page of every made-up view would freeze the screen.
function dayNumber(day: DateTime): number {
  return Math.floor((day.toMillis() + day.offset * 60000) / 86400000)
}

let pagesMade: { w: World; pages: Page[] } | null = null

function pagesOf(w: World): Page[] {
  if (pagesMade?.w === w) return pagesMade.pages
  const pages: Page[] = STATIC_PAGES.map(([path, title, weight]) => ({
    path,
    title,
    weight: () => weight,
    archive: false,
  }))
  for (const post of w.posts) {
    const published = dayNumber(post.date)
    pages.push({
      path: post.url,
      title: post.title,
      archive: false,
      weight: (day) => {
        const after = dayNumber(day) - published
        if (after < 0) return 0
        return (
          post.pull *
          (after < 7 ? 3.4 - after * 0.38 : 0.55 + 0.9 / Math.sqrt(after / 7))
        )
      },
    })
  }
  const categories = new Map<string, string>()
  const tags = new Map<string, string>()
  for (const post of w.posts) {
    for (const c of post.categories) categories.set(c.slug, c.name)
    for (const t of post.tags) tags.set(t.slug, t.name)
  }
  for (const [slug, name] of categories) {
    pages.push({
      path: `/category/${slug}`,
      title: `Category: ${name}`,
      archive: true,
      weight: () => 0.09 + chance('cat', slug) * 0.12,
    })
  }
  for (const [slug, name] of tags) {
    pages.push({
      path: `/tag/${slug}`,
      title: `Tag: ${name}`,
      archive: true,
      weight: () => 0.015 + chance('tag', slug) * 0.04,
    })
  }
  pages.push({
    path: '/search',
    title: 'Search',
    archive: true,
    weight: () => 0.16,
  })
  pagesMade = { w, pages }
  return pages
}

// A list made by sharing views out by weight, with a little noise for the
// period so lists do not look printed from one template.
function shared<T extends string>(
  total: number,
  choices: readonly (readonly [T, number])[],
  salt: string,
  limit = LIST_LENGTH
): [T, number][] {
  const noisy = choices.map(
    ([key, weight]) => [key, weight * (0.75 + chance(salt, key) * 0.5)] as const
  )
  const sum = noisy.reduce((s, [, weight]) => s + weight, 0)
  return noisy
    .map(
      ([key, weight]) =>
        [key, Math.round((total * weight) / sum)] as [T, number]
    )
    .filter(([, views]) => views > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

function rows(
  list: [string, number][],
  label = (key: string) => key
): ViewListRow[] {
  return list.map(([key, views]) => ({ key, label: label(key), views }))
}

function placesFor(total: number, salt: string) {
  const countries = shared(total, COUNTRIES, `${salt}c`)
  const regions: [string, number][] = []
  const cities: [string, number][] = []
  for (const [country, views] of countries) {
    const places = PLACES[country]
    if (!places) continue
    for (const [region, views2] of shared(
      views * 0.93,
      places.map(([r, , w]) => [r, w] as const),
      `${salt}${country}`
    )) {
      regions.push([`${region}|${country}`, views2])
      const towns = places.find(([r]) => r === region)![1]
      for (const [city, views3] of shared(
        views2 * 0.95,
        towns.map((t, i) => [t, 1 / (i + 1)] as const),
        `${salt}${region}`
      )) {
        cities.push([`${city}|${region}|${country}`, views3])
      }
    }
  }
  return {
    countries: countries.map(([key, views]) => ({
      key,
      label: key,
      country: key,
      views,
    })),
    regions: regions
      .sort((a, b) => b[1] - a[1])
      .slice(0, LIST_LENGTH)
      .map(([key, views]) => {
        const [label, country] = key.split('|')
        return { key, label: label!, country: country!, views }
      }),
    cities: cities
      .sort((a, b) => b[1] - a[1])
      .slice(0, LIST_LENGTH)
      .map(([key, views]) => {
        const [city, region, country] = key.split('|')
        return { key, label: `${city}, ${region}`, country: country!, views }
      }),
  }
}

function campaignsList(w: World, total: number, salt: string): ViewListRow[] {
  const choices: [string, number][] = [
    ['twitter / social / (none)', 3],
    ['linkedin / social / (none)', 2.4],
    ['hn / (none) / (none)', 0.6],
    ['producthunt / launch / (none)', 0.3],
  ]
  // A reminder carries its post's campaign name, so it adds to that line.
  for (const one of w.sent.slice(-8)) {
    const slug = one.post.url.split('/').pop() ?? 'post'
    const key = `newsletter / email / ${slug}`
    if (!choices.some(([known]) => known === key)) {
      choices.push([key, 2 + chance('nl', one.id) * 4])
    }
  }
  return rows(shared(total * 0.07, choices, `${salt}utm`))
}

function devicesList(total: number, salt: string): ViewListRow[] {
  return rows(
    shared(
      total,
      DEVICES.map(
        ([browser, os, device, weight]) =>
          [`${browser} on ${os} · ${device}`, weight] as const
      ),
      `${salt}dev`
    )
  )
}

const DAYS_BACK: Partial<Record<ViewPeriod, number>> = {
  '7d': 6,
  '30d': 29,
  '90d': 89,
}

async function pageViews(params: URLSearchParams): Promise<PageViewReport> {
  const w = await world()
  const period = (params.get('period') ?? '30d') as ViewPeriod
  const rawPath = params.get('path') ? pathKey(params.get('path')!) : ''
  const bucketKey = params.get('bucket') ?? ''
  const pages = pagesOf(w)
  const page = rawPath ? pages.find((p) => p.path === rawPath) : null
  const moment = now()
  const today = moment.startOf('day')

  // The page's share of the site on a day.
  const share = (day: DateTime) => {
    if (!rawPath) return 1
    if (!page) return 0
    const all = pages.reduce((sum, p) => sum + p.weight(day), 0)
    return all ? page.weight(day) / all : 0
  }
  const dayCount = (day: DateTime) => scaled(siteDay(w, day), share(day))

  const hourly = period === 'today' || period === 'yesterday'
  const daysBack = DAYS_BACK[period]
  const unit: PageViewReport['unit'] = hourly
    ? 'hour'
    : daysBack === undefined
      ? 'month'
      : 'day'

  let from: DateTime
  let before: DateTime | null
  if (hourly) {
    from = period === 'today' ? today : today.minus({ days: 1 })
    before = from.minus({ days: 1 })
  } else if (daysBack !== undefined) {
    from = today.minus({ days: daysBack })
    before = from.minus({ days: daysBack + 1 })
  } else if (period === '12m') {
    from = today.startOf('month').minus({ months: 11 })
    before = from.minus({ months: 12 })
  } else {
    from = w.launch
    before = null
  }

  // A day's views up to this moment of the day: the hours that have
  // passed, and the part of this one. The chart's bars add up to the same.
  const soFar = (count: ViewCount) => {
    const part =
      (HOUR_SHAPE.slice(0, moment.hour).reduce((a, b) => a + b, 0) +
        (HOUR_SHAPE[moment.hour]! * moment.minute) / 60) /
      HOUR_TOTAL
    return scaled(count, part)
  }
  const hourCount = (day: DateTime, hour: number) =>
    scaled(dayCount(day), HOUR_SHAPE[hour]! / HOUR_TOTAL)
  // Today so far, hour by hour as the chart counts it, so every number for
  // today agrees.
  const todaySoFar = () => {
    const hours: ViewCount[] = []
    for (let hour = 0; hour < moment.hour; hour++)
      hours.push(hourCount(today, hour))
    hours.push(scaled(hourCount(today, moment.hour), moment.minute / 60))
    return summed(hours)
  }

  const published = new Map<string, string[]>()
  if (!rawPath && unit !== 'month') {
    for (const post of w.posts) {
      const key =
        unit === 'hour'
          ? post.date.toFormat("yyyy-MM-dd'T'HH")
          : dayKey(post.date)
      published.set(key, [...(published.get(key) ?? []), post.title])
    }
  }

  const titlesAt = (key: string) => {
    const titles = published.get(key)
    return titles ? { published: titles } : {}
  }

  const buckets: ViewBucket[] = []
  if (hourly) {
    const last = period === 'today' ? moment.hour : 23
    for (let hour = 0; hour <= last; hour++) {
      // Counted on from midnight, so the hour the clocks skip is not two.
      const at = from.plus({ hours: hour })
      const key = at.toFormat("yyyy-MM-dd'T'HH")
      let count = hourCount(from, hour)
      if (period === 'today' && hour === last)
        count = scaled(count, moment.minute / 60)
      buckets.push({ key, ...count, ...titlesAt(key) })
    }
  } else {
    for (
      let at = from;
      at <= today;
      at = at.plus(unit === 'day' ? { days: 1 } : { months: 1 })
    ) {
      if (unit === 'day') {
        const key = dayKey(at)
        const count = at.hasSame(today, 'day') ? todaySoFar() : dayCount(at)
        buckets.push({ key, ...count, ...titlesAt(key) })
      } else {
        const days: ViewCount[] = []
        for (
          let d = at.startOf('month');
          d <= at.endOf('month') && d <= today;
          d = d.plus({ days: 1 })
        ) {
          days.push(d.hasSame(today, 'day') ? todaySoFar() : dayCount(d))
        }
        buckets.push({ key: at.toFormat('yyyy-MM'), ...summed(days) })
      }
    }
  }

  const inPeriod = summed(buckets)
  const todayCount = todaySoFar()

  let previous: ViewCount | null = null
  if (before) {
    const days: ViewCount[] = []
    if (hourly) {
      previous = period === 'today' ? soFar(dayCount(before)) : dayCount(before)
    } else {
      for (let d = before; d < from; d = d.plus({ days: 1 }))
        days.push(dayCount(d))
      previous = summed(days)
    }
  }

  const everyDay: [DateTime, ViewCount][] = []
  for (let d = w.launch; d <= today; d = d.plus({ days: 1 })) {
    everyDay.push([d, d.hasSame(today, 'day') ? todayCount : dayCount(d)])
  }
  const allTime = summed(everyDay.map(([, c]) => c))
  const best = everyDay.reduce(
    (top, item) => (item[1].views > top[1].views ? item : top),
    everyDay[0]!
  )

  // The lists cover the bar pressed, or the whole period.
  const pressed = buckets.find((b) => b.key === bucketKey)
  const listTotal = (pressed ?? inPeriod).views
  const salt = `${period}|${bucketKey}|${rawPath}`
  const listDay = hourly
    ? from
    : today.minus({ days: Math.floor((daysBack ?? 30) / 2) })

  const pageList = (archive: boolean) => {
    if (rawPath) return []
    const own = pages.filter((p) => p.archive === archive)
    const weightAll = pages.reduce((s, p) => s + p.weight(listDay), 0)
    const part =
      own.reduce((s, p) => s + p.weight(listDay), 0) / (weightAll || 1)
    return shared(
      listTotal * part,
      own.map((p) => [p.path, p.weight(listDay)] as const),
      `${salt}${archive}`
    ).map(([key, views]) => ({
      key,
      label: own.find((p) => p.path === key)!.title,
      href: key === '/' ? '/' : `${key}/`,
      views,
    }))
  }

  const places = placesFor(listTotal * 0.97, salt)
  return {
    period,
    unit,
    buckets,
    today: todayCount,
    inPeriod,
    previous,
    allTime,
    bestDay:
      best && best[1].views > 0
        ? { day: dayKey(best[0]), views: best[1].views }
        : null,
    pages: pageList(false),
    archives: pageList(true),
    referrers: rows(shared(listTotal * 0.38, REFERRERS, `${salt}ref`)),
    campaigns: campaignsList(w, listTotal, salt),
    countries: places.countries,
    regions: places.regions,
    cities: places.cities,
    devices: devicesList(listTotal, salt),
    logCutShort: false,
  }
}

async function liveCounts(params: URLSearchParams): Promise<LiveCounts> {
  const report = await pageViews(new URLSearchParams({ period: 'today' }))
  const path = pathKey(params.get('path') ?? '/')
  const w = await world()
  const known = pagesOf(w).some((p) => p.path === path)
  const day = dayKey(now())
  let page: ViewCount | null = null
  if (known) {
    const all = await pageViews(new URLSearchParams({ period: 'all', path }))
    page = all.allTime
  }
  return { from: day, to: day, site: report.today, page }
}

// --- The visit log ---

function ipFor(visitor: number): string {
  const r = (n: number) => chance('ip', visitor, n)
  if (r(0) < 0.18) {
    const groups = Array.from({ length: 4 }, (_, i) =>
      Math.floor(r(i + 1) * 65535).toString(16)
    )
    return `2${Math.floor(r(9) * 3) + 6}0${Math.floor(r(8) * 9)}:${groups.join(':')}::${Math.floor(r(7) * 255).toString(16)}`
  }
  const first = pick(
    [
      24, 47, 50, 63, 67, 68, 71, 73, 76, 81, 82, 86, 92, 98, 99, 104, 107, 108,
      136, 142, 151, 162, 172, 174, 185, 188, 194, 203, 209, 212,
    ],
    r(1)
  )
  return `${first}.${Math.floor(r(2) * 254) + 1}.${Math.floor(r(3) * 254) + 1}.${Math.floor(r(4) * 253) + 1}`
}

const VISIT_DAYS = 120

async function visitLog(params: URLSearchParams): Promise<VisitLogPage> {
  const w = await world()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const ip = params.get('ip') ?? ''
  const path = params.get('path') ? pathKey(params.get('path')!) : ''
  const search = (params.get('search') ?? '').trim().toLowerCase()
  const pages = pagesOf(w)
  const moment = now()

  // Views counted back from now, hour by hour, so each row has its time.
  const all: VisitRow[] = []
  const filtered = Boolean(ip || path || search)
  const wanted = filtered ? Infinity : page * PER_PAGE
  let id = 0
  const total = summed(
    Array.from({ length: VISIT_DAYS }, (_, i) =>
      siteDay(w, moment.startOf('day').minus({ days: i }))
    )
  ).views

  outer: for (let back = 0; back < VISIT_DAYS * 24; back++) {
    const hourStart = moment.startOf('hour').minus({ hours: back })
    const day = hourStart.startOf('day')
    let count = Math.round(
      (siteDay(w, day).views * HOUR_SHAPE[hourStart.hour]!) / HOUR_TOTAL
    )
    if (back === 0) count = Math.round((count * moment.minute) / 60)
    const weightAll = pages.reduce((s, p) => s + p.weight(day), 0)
    // People read a few pages each: a visitor's views come together.
    let visitor = 0
    let left = 0
    for (let n = 0; n < count; n++) {
      id++
      const r = (what: string) => chance(what, hourStart.toMillis(), n)
      // The first view of a visitor's few is how they arrived.
      const arrived = left <= 0
      if (arrived) {
        visitor = hash('visitor', hourStart.toMillis(), n) % 900000
        left = 1 + Math.floor(r('depth') ** 2 * 4)
      }
      const first = arrived && r('entry') < 0.9
      left--
      const at =
        seconds(hourStart) +
        Math.floor((1 - (n + r('t') * 0.9) / Math.max(1, count)) * 3600)
      if (at > seconds(moment)) continue
      let roll = r('page') * weightAll
      let chosen = pages[0]!
      for (const candidate of pages) {
        roll -= candidate.weight(day)
        if (roll < 0) {
          chosen = candidate
          break
        }
      }
      const v = (what: string) => chance(what, visitor)
      const country = weighted(COUNTRIES, v('country'))
      const places = PLACES[country]
      const place = places
        ? weighted(
            places.map(([r2, , wgt]) => [r2, wgt] as const),
            v('region')
          )
        : ''
      const city =
        places && place
          ? pick(places.find(([r2]) => r2 === place)![1], v('city') ** 1.5)
          : ''
      const [browser, os, device] = weighted(
        DEVICES.map(([b, o, d, wgt]) => [[b, o, d], wgt] as const),
        v('device')
      )
      const referrer =
        first && r('ref') < 0.55 ? weighted(REFERRERS, r('refwho')) : ''
      const newsletter =
        first && !referrer && r('utm') < 0.22
          ? sentBefore(w, seconds(hourStart), r('which'))
          : undefined
      const row: VisitRow = {
        id: 5000000 - id,
        at,
        path: chosen.path,
        title: chosen.title,
        isVisit: first,
        referrer,
        utmSource: newsletter ? 'newsletter' : '',
        utmMedium: newsletter ? 'email' : '',
        utmCampaign: newsletter
          ? (newsletter.post.url.split('/').pop() ?? '')
          : '',
        country,
        region: place,
        city,
        device,
        browser,
        os,
        ip: ipFor(visitor),
      }
      if (ip && row.ip !== ip) continue
      if (path && row.path !== path) continue
      if (
        search &&
        ![
          row.path,
          row.title,
          row.referrer,
          row.city,
          row.region,
          row.country,
          row.ip,
          row.browser,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search)
      ) {
        continue
      }
      all.push(row)
      if (all.length >= wanted) break outer
    }
    // A search reads back two weeks at the most, so it answers at once.
    if (filtered && back > 14 * 24) break
  }

  const count = filtered ? all.length : total
  return {
    rows: all.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    total: count,
    page,
    pages: Math.max(1, Math.ceil(count / PER_PAGE)),
  }
}

// --- FlowTrace ---

// The demo's converted visits: a small share of each day's made-up visits
// (the same visits the demo's Analytics counts), each with the pages read
// before, what they did and how the report email went. Made the same way
// every time from the day's own seed, so a visit keeps its id and its story.

// What converts, and how often. The site has no phone links.
const FT_KINDS: readonly (readonly [FtConversion, number])[] = [
  ['newsletter', 46],
  ['email', 22],
  ['form', 16],
  ['signup', 12],
  ['click', 4],
]

const FT_LABELS: Record<FtConversion, string[]> = {
  form: ['Contact form'],
  newsletter: ['Newsletter form'],
  signup: ['Account confirmed'],
  email: ['hello@example.com'],
  call: [''],
  click: ['Read the Latest Essays', 'Browse the full archive'],
}

// Who the demo's reports go to: made-up addresses only.
const FT_TEAM = ['editor@example.com', 'founder@example.com']

const ftDayCache = new Map<
  string,
  { visit: FtVisit; events: FtEvent[]; sends: FtVisitReport['sends'] }[]
>()

function ftDay(w: World, day: DateTime) {
  const key = dayKey(day)
  const known = ftDayCache.get(key)
  if (known) return known
  const out: {
    visit: FtVisit
    events: FtEvent[]
    sends: FtVisitReport['sends']
  }[] = []
  if (day < w.launch) return out

  const roll = seeded(hash('flowtrace', key))
  const visits = siteDay(w, day).visits
  const rate = 0.015 + roll() * 0.02
  const count = Math.round(visits * rate + roll() * 0.6)
  const pages = pagesOf(w).filter(
    (page) => !page.archive || page.path === '/search'
  )
  const weightAll = pages.reduce((sum, page) => sum + page.weight(day), 0) || 1

  for (let n = 0; n < count; n++) {
    // When in the day, by the same hours the views follow
    let hourRoll = roll() * HOUR_TOTAL
    let hour = 0
    while (hour < 23 && hourRoll > HOUR_SHAPE[hour]!)
      hourRoll -= HOUR_SHAPE[hour++]!
    const startedAt = seconds(
      day.plus({ hours: hour, minutes: Math.floor(roll() * 60) })
    )
    const id = `demo-${key.replace(/-/g, '')}-${n}-${hash('ft', key, n).toString(36)}`
    const visitor = hash('ft-visitor', key, n) % 900000

    // Where they came from
    const sourceRoll = roll()
    const newsletter =
      sourceRoll < 0.18
        ? sentBefore(w, seconds(day), roll())
        : undefined
    const referrer =
      !newsletter && sourceRoll < 0.72 ? weighted(REFERRERS, roll()) : ''
    const country = weighted(COUNTRIES, roll())
    const places = PLACES[country]
    const region = places
      ? weighted(
          places.map(([r, , wt]) => [r, wt] as const),
          roll()
        )
      : ''
    const city =
      places && region
        ? pick(places.find(([r]) => r === region)![1], roll() ** 1.5)
        : ''
    const [browser, os, device] = weighted(
      DEVICES.map(([b, o, d, wt]) => [[b, o, d], wt] as const),
      roll()
    )

    // The pages they read, then what they did
    const steps = 1 + Math.floor(roll() ** 1.4 * 6)
    const kind = weighted(FT_KINDS, roll())
    const events: FtEvent[] = []
    let at = startedAt
    let engaged = 0
    for (let step = 0; step < steps; step++) {
      let pageRoll = roll() * weightAll
      let chosen = pages[0]!
      for (const page of pages) {
        pageRoll -= page.weight(day)
        if (pageRoll < 0) {
          chosen = page
          break
        }
      }
      const ms = Math.round((20 + roll() ** 1.8 * 420) * 1000)
      events.push({
        id: hash('ft-event', id, step),
        at,
        type: 'pageview',
        path: `${chosen.path === '/' ? '' : chosen.path}/`,
        title: chosen.title,
        label: '',
        href: '',
        engagedMs: ms,
      })
      engaged += ms
      at += Math.round(ms / 1000) + Math.floor(roll() * 20)
    }
    const where =
      kind === 'form'
        ? '/contact/'
        : kind === 'signup'
          ? '/account/'
          : events[events.length - 1]!.path
    events.push({
      id: hash('ft-event', id, 'conversion'),
      at,
      type: kind,
      path: where,
      title: '',
      label: pick(FT_LABELS[kind], roll()),
      href: kind === 'email' ? 'mailto:hello@example.com' : '',
      engagedMs: 0,
    })

    const visitNumber = roll() < 0.62 ? 1 : 2 + Math.floor(roll() ** 2 * 9)
    const failed = roll() < 0.012
    const gaveUp = seconds(now()) - at > flowTraceConfig.retryHours * 3600
    const sends = FT_TEAM.map((email, index) => ({
      email,
      at: at + 2 + index,
      ok: !failed,
      error: failed ? 'E_RATE_LIMIT_EXCEEDED' : '',
    }))
    out.push({
      visit: {
        id,
        visitorId: `demo-visitor-${visitor}`,
        visitNumber,
        startedAt,
        lastAt: at,
        entryPath: events[0]!.path,
        referrer,
        utmSource: newsletter ? 'newsletter' : '',
        utmMedium: newsletter ? 'email' : '',
        utmCampaign: newsletter
          ? (newsletter.post.url.split('/').pop() ?? '')
          : '',
        utmTerm: '',
        utmContent: '',
        country,
        region,
        city,
        device,
        browser,
        os,
        ip: ipFor(visitor),
        pageviews: steps,
        engagedMs: engaged,
        conversions: 1,
        firstConversion: kind,
        // A report that could not go out is tried for a day, then given up on
        reportedAt: failed ? (gaveUp ? at + 86400 : null) : at + 3,
        reportStatus: failed ? (gaveUp ? 'failed' : 'waiting') : 'sent',
        firstSeen:
          visitNumber > 1
            ? startedAt - Math.floor(roll() * 120) * 86400 - 3600
            : startedAt,
        visitorEngagedMs:
          engaged + (visitNumber - 1) * Math.round((60 + roll() * 300) * 1000),
      },
      events,
      sends,
    })
  }
  ftDayCache.set(key, out)
  return out
}

// The converted visits between two times, newest first, up to now.
function ftVisitsBetween(w: World, from: number, to: number) {
  const end = Math.min(to, seconds(now()))
  const found: ReturnType<typeof ftDay> = []
  const first = DateTime.max(
    DateTime.fromSeconds(from, { zone: ZONE }).startOf('day'),
    w.launch
  )
  for (
    let day = DateTime.fromSeconds(end, { zone: ZONE }).startOf('day');
    day >= first;
    day = day.minus({ days: 1 })
  ) {
    for (const item of [...ftDay(w, day)].reverse()) {
      // A report emailed in the last few minutes is still on its way
      if (item.visit.startedAt >= from && item.visit.lastAt <= end)
        found.push(item)
    }
  }
  return found.sort((a, b) => b.visit.startedAt - a.visit.startedAt)
}

function ftCounts(items: ReturnType<typeof ftDay>): FtCounts {
  const conversions = Object.fromEntries(
    FT_CONVERSIONS.map((type) => [type, 0])
  ) as Record<FtConversion, number>
  for (const item of items) {
    for (const event of item.events) {
      if (event.type !== 'pageview') conversions[event.type]++
    }
  }
  return { converted: items.length, conversions }
}

function ftGrouped(
  items: ReturnType<typeof ftDay>,
  keyOf: (visit: FtVisit) => string | null
) {
  const counts = new Map<string, number>()
  for (const { visit } of items) {
    const key = keyOf(visit)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, LIST_LENGTH)
}

async function ftOverview(params: URLSearchParams): Promise<FtOverview> {
  const w = await world()
  const period = periodOf(params.get('period'), '30d')
  const range = periodRange(period)
  const items = ftVisitsBetween(w, range.from, range.to)
  // The visits the conversions are measured against: the demo's Analytics own
  const views = await pageViews(new URLSearchParams({ period }))
  const pageCounts = new Map<string, number>()
  for (const item of items) {
    for (const event of item.events) {
      if (event.type === 'pageview')
        pageCounts.set(event.path, (pageCounts.get(event.path) ?? 0) + 1)
    }
  }
  const before = range.previous
    ? ftVisitsBetween(w, range.previous.from, range.previous.to)
    : null
  const source = (visit: FtVisit) =>
    visit.utmSource || visit.referrer || 'Direct'
  return {
    period,
    summary: {
      from: range.from,
      to: range.to,
      visits: views.inPeriod.visits,
      ...ftCounts(items),
      sources: ftGrouped(items, source).map(([key, views]) => ({
        key,
        label: key,
        views,
      })),
      pages: [...pageCounts]
        .sort((a, b) => b[1] - a[1])
        .slice(0, LIST_LENGTH)
        .map(
          ([key, views]): FtListRow => ({ key, label: key, href: key, views })
        ),
      countries: ftGrouped(items, (visit) => visit.country || null).map(
        ([key, views]) => ({
          key,
          label: key,
          country: key,
          views,
        })
      ),
      regions: ftGrouped(items, (visit) =>
        visit.region ? `${visit.region}|${visit.country}` : null
      ).map(([key, views]) => ({
        key,
        label: key.split('|')[0]!,
        country: key.split('|')[1]!,
        views,
      })),
      cities: ftGrouped(items, (visit) =>
        visit.city ? `${visit.city}|${visit.region}|${visit.country}` : null
      ).map(([key, views]) => {
        const [city, region, country] = key.split('|')
        return {
          key,
          label: [city, region].filter(Boolean).join(', '),
          country: country!,
          views,
        }
      }),
      devices: ftGrouped(
        items,
        (visit) => `${visit.browser} on ${visit.os} · ${visit.device}`
      ).map(([key, views]) => ({ key, label: key, views })),
      convertedVisits: items.slice(0, 25).map((item) => item.visit),
    },
    before: before
      ? { ...ftCounts(before), visits: views.previous?.visits ?? null }
      : null,
  }
}

async function ftVisitPage(params: URLSearchParams): Promise<FtVisitPage> {
  const w = await world()
  const range = periodRange(periodOf(params.get('period'), 'all'))
  const page = Math.max(1, Number(params.get('page')) || 1)
  const ip = params.get('ip') ?? ''
  const search = (params.get('search') ?? '').trim().toLowerCase()
  const rows = ftVisitsBetween(w, range.from, range.to)
    .filter((item) => !ip || item.visit.ip === ip)
    .filter(
      (item) =>
        !search ||
        item.visit.ip.includes(search) ||
        item.events.some((event) => event.path.toLowerCase().includes(search))
    )
    .map((item) => item.visit)
  return {
    rows: rows.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    total: rows.length,
    page,
    pages: Math.max(1, Math.ceil(rows.length / PER_PAGE)),
  }
}

async function ftReport(params: URLSearchParams): Promise<FtVisitReport> {
  const w = await world()
  const id = params.get('id') ?? ''
  const day = id.match(/^demo-(\d{4})(\d{2})(\d{2})-/)
  const found = day
    ? ftDay(
        w,
        DateTime.fromObject(
          { year: +day[1]!, month: +day[2]!, day: +day[3]! },
          { zone: ZONE }
        )
      ).find((item) => item.visit.id === id)
    : undefined
  if (!found) throw new Error('This visit is no longer available.')
  // The visitor's other converted visits, where the demo made any
  const others = ftVisitsBetween(
    w,
    found.visit.startedAt - 90 * 86400,
    found.visit.startedAt
  )
    .filter(
      (item) =>
        item.visit.visitorId === found.visit.visitorId && item.visit.id !== id
    )
    .map((item) => item.visit)
  return {
    visit: found.visit,
    events: found.events,
    otherVisits: others,
    sends: [...found.sends].reverse(),
  }
}

function ftSettings(): FtSettings {
  return {
    email: FT_TEAM[0]!,
    recipient: true,
    mode: flowTraceConfig.defaultEmailMode,
    team: [
      { email: FT_TEAM[0]!, mode: 'instant' },
      { email: FT_TEAM[1]!, mode: 'daily' },
    ],
  }
}

// --- The router ---

type CallOptions = { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown }

async function serverDemo<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/demo/email/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(
      json?.message || `The server answered ${response.status}.`
    ) as Error & {
      used?: boolean
    }
    error.used = json?.used === true
    throw error
  }
  return json as T
}

// Answers a call to /api/mailing or /api/analytics as the real route would,
// from the made-up data. The answers take a moment, as the real ones do.
export async function demoCall<T>(
  url: string,
  options: CallOptions = {}
): Promise<T> {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST')
  const body = (options.body ?? {}) as Record<string, unknown>
  const parsed = new URL(url, window.location.origin)
  const path = parsed.pathname.replace(/\/$/, '')
  const params = parsed.searchParams

  await wait(140 + Math.random() * 260)
  const w = await world()

  if (path === '/api/analytics/live') return (await liveCounts(params)) as T
  if (path === '/api/analytics') return (await pageViews(params)) as T
  if (path === '/api/analytics/visits') return (await visitLog(params)) as T

  if (path === '/api/flowtrace/summary') return (await ftOverview(params)) as T
  if (path === '/api/flowtrace/visits') return (await ftVisitPage(params)) as T
  if (path === '/api/flowtrace/visit') return (await ftReport(params)) as T
  if (path === '/api/flowtrace/settings') {
    if (method === 'GET') return ftSettings() as T
    throw new Error('This is the demo: email settings cannot be changed here.')
  }
  // The one real thing FlowTrace does in the demo: a report on a made-up
  // visit, to an address the visitor gives, once per address.
  if (path === '/api/flowtrace/test-report') {
    if (!body.email) throw new Error('Enter the address to send the test report to.')
    return serverDemo<T>({ action: 'flowtrace-test', email: body.email })
  }

  if (path === '/api/mailing/preview') {
    return serverDemo<T>({
      action: 'preview',
      path: body.path,
      subject: body.subject,
      preheader: body.preheader,
    })
  }
  if (path === '/api/mailing/test') {
    if (!body.email) throw new Error('Enter the address to send the test to.')
    return serverDemo<T>({ action: 'send', path: body.path, email: body.email })
  }

  if (path === '/api/mailing/subscribers') {
    if (method === 'GET') {
      const id = Number(params.get('id'))
      if (id) {
        const person = w.byId.get(id)
        if (!person) throw new Error('That subscriber was not found.')
        return {
          subscriber: subscriberRow(w, person),
          history: historyOf(w, id),
        } as T
      }
      return listSubscribers(w, params) as T
    }
    if (body.action === 'check') {
      return { check: checkList(w, (body.list as NewSubscriber[]) ?? []) } as T
    }
    throw new Error(DEMO_REFUSAL)
  }

  if (path === '/api/mailing/campaigns') {
    if (method === 'GET') {
      const postId = Number(params.get('postId'))
      const sent = w.sent
        .filter((one) => one.post.id === postId)
        .map((one) => campaignOf(w, one))
      const mine = [...made.values()]
        .filter((m) => m.campaign.postId === postId)
        .map((m) => m.campaign)
      return {
        campaigns: [...mine, ...sent].sort((a, b) => b.createdAt - a.createdAt),
      } as T
    }
    // A campaign of this visit's own: the list as it stands, nobody emailed.
    const post = w.posts.find(
      (p) =>
        `${p.url}/` === String(body.path) ||
        p.url === String(body.path).replace(/\/$/, '')
    )
    if (!post) throw new Error('That post was not found.')
    const ticked = Array.isArray(body.audience)
      ? new Set(body.audience as number[])
      : null
    const people = allSubscribers(w).filter(
      (row) => row.status === 'subscribed' && (!ticked || ticked.has(row.id))
    )
    if (!people.length)
      throw new Error(
        'Nobody chosen is subscribed, so there is no one to send it to.'
      )
    const id = nextMadeId++
    const created = seconds(now())
    const entry: Made = {
      campaign: {
        id,
        postId: post.id,
        postUrl: post.url,
        postTitle: post.title,
        subject: String(body.subject || post.title),
        preheader: String(body.preheader || ''),
        status: 'draft',
        pauseReason: '',
        createdAt: created,
        startedAt: null,
        finishedAt: null,
        totals: totalsOf([]),
      },
      rows: people.map((row) => ({
        id: id * 10000 + row.id,
        subscriberId: row.id,
        email: row.email,
        name: [row.firstName, row.lastName].filter(Boolean).join(' '),
        status: 'queued',
        error: '',
        sentAt: null,
        deliveredAt: null,
        bouncedAt: null,
        bounceType: '',
        complainedAt: null,
        unsubscribedAt: null,
        opens: 0,
        clicks: 0,
        lastEventAt: null,
      })),
    }
    refreshTotals(entry)
    made.set(id, entry)
    return { id, queued: entry.rows.length, campaign: entry.campaign } as T
  }

  const one = path.match(/^\/api\/mailing\/campaigns\/(\d+)(\/send)?$/)
  if (one) {
    const id = Number(one[1])
    const mine = madeCampaign(id)
    const sentOne = w.sent.find((s) => s.id === id)

    if (one[2]) {
      if (!mine) throw new Error('That campaign was already sent.')
      if (body.action === 'pause') {
        mine.campaign = {
          ...mine.campaign,
          status: 'paused',
          pauseReason: 'Paused by you.',
        }
        return { campaign: mine.campaign } as T
      }
      // A batch "sent": a few dozen at a time, as fast as it looks real.
      const waiting = mine.rows
        .filter((row) => row.status === 'queued')
        .slice(0, 60)
      if (!waiting.length) {
        mine.campaign = {
          ...mine.campaign,
          status: 'sent',
          pauseReason: '',
          finishedAt: seconds(now()),
        }
        refreshTotals(mine)
        return { campaign: mine.campaign, done: true } as T
      }
      await wait(350)
      const at = seconds(now())
      for (const row of waiting) {
        row.status = 'sent'
        row.sentAt = at
        row.lastEventAt = at
        if (chance('demo-delivered', row.id) > 0.004) row.deliveredAt = at + 2
        else {
          row.bouncedAt = at + 2
          row.bounceType = 'hard'
        }
      }
      mine.campaign = {
        ...mine.campaign,
        status: 'sending',
        startedAt: mine.campaign.startedAt ?? at,
      }
      refreshTotals(mine)
      return { campaign: mine.campaign } as T
    }

    if (method === 'DELETE') {
      if (mine && mine.campaign.status === 'draft') {
        made.delete(id)
        return { deleted: true } as T
      }
      throw new Error('Only a campaign that has not been sent can be removed.')
    }

    if (mine) return reportOf(mine.campaign, mine.rows, params) as T
    if (sentOne)
      return reportOf(campaignOf(w, sentOne), sentRows(w, sentOne), params) as T
    throw new Error('That campaign was not found.')
  }

  throw new Error('This is not part of the demo.')
}
