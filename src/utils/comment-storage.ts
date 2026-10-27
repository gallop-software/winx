import { DateTime } from 'luxon'
import type { SiteComment } from '@/utils/comment-types'

// What the comments section keeps in the visitor's own browser: the name and
// email address they commented with, and their comments that are waiting for
// approval. Nothing here is sent anywhere.
//
// Every read and write is allowed to fail. A browser in private mode, or with
// storage switched off, throws instead of storing.

const COMMENTER_KEY = 'gallop_commenter'
const PENDING_KEY = 'gallop_pending_comments'

// A comment not approved within this long is not going to be.
const PENDING_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const PENDING_MAX_PER_POST = 20

export type Commenter = { name: string; email: string }

type Pending = { comment: SiteComment; savedAt: number }

function read(key: string): unknown {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Not kept. The comment itself was saved.
  }
}

export function readCommenter(): Commenter {
  const stored = read(COMMENTER_KEY) as Partial<Commenter> | null
  return {
    name: typeof stored?.name === 'string' ? stored.name.slice(0, 245) : '',
    email: typeof stored?.email === 'string' ? stored.email.slice(0, 100) : '',
  }
}

export function writeCommenter(commenter: Commenter) {
  write(COMMENTER_KEY, commenter)
}

// What was stored is read as carefully as anything else from outside the
// code: it may have been written by an older version, or by hand.
function isComment(value: unknown): value is SiteComment {
  if (!value || typeof value !== 'object') return false
  const comment = value as Partial<SiteComment>
  return (
    typeof comment.id === 'number' &&
    typeof comment.parent === 'number' &&
    typeof comment.authorName === 'string' &&
    typeof comment.dateGmt === 'string' &&
    Array.isArray(comment.body)
  )
}

function readAll(): Record<string, Pending[]> {
  const stored = read(PENDING_KEY)
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}

  const now = DateTime.now().toMillis()
  const all: Record<string, Pending[]> = {}

  for (const [post, items] of Object.entries(stored)) {
    if (!Array.isArray(items)) continue
    const kept: Pending[] = []
    for (const item of items as Partial<Pending>[]) {
      if (!isComment(item?.comment) || typeof item.savedAt !== 'number') {
        continue
      }
      if (now - item.savedAt > PENDING_MAX_AGE_MS) continue
      kept.push({
        // What is kept is only ever shown as waiting, and never as the
        // author's: neither can be claimed by editing what is stored.
        comment: {
          ...item.comment,
          status: 'pending',
          isPostAuthor: false,
          authorUrl: '',
          avatar: null,
        },
        savedAt: item.savedAt,
      })
    }
    if (kept.length) all[post] = kept
  }

  return all
}

// The visitor's comments on a post that are waiting for approval. Any that
// `approved` shows to have been approved since are forgotten.
export function readPending(
  postId: number,
  approved: ReadonlySet<number>
): SiteComment[] {
  const all = readAll()
  const mine = all[String(postId)] ?? []
  const waiting = mine.filter((item) => !approved.has(item.comment.id))

  if (waiting.length !== mine.length) {
    if (waiting.length) all[String(postId)] = waiting
    else delete all[String(postId)]
    write(PENDING_KEY, all)
  }

  return waiting.map((item) => item.comment)
}

export function addPending(postId: number, comment: SiteComment) {
  const all = readAll()
  const mine = (all[String(postId)] ?? []).filter(
    (item) => item.comment.id !== comment.id
  )
  mine.push({ comment, savedAt: DateTime.now().toMillis() })
  all[String(postId)] = mine.slice(-PENDING_MAX_PER_POST)
  write(PENDING_KEY, all)
}
