import type { NextRequest } from 'next/server'
import { adminRoute, positiveInteger, problem, readInput, reply } from '@/utils/mailing-route'
import type { NewSubscriber, SubscriberSort } from '@/utils/mailing-types'
import { sendConfirmation } from '@/utils/newsletter'
import {
  SUBSCRIBERS_PER_PAGE,
  addSubscribers,
  checkSubscribers,
  deleteSelected,
  getSubscriber,
  listSubscribers,
  pendingSelected,
  queryOf,
  renameSubscriber,
  resubscribeSelected,
  subscriberHistory,
  unsubscribeSelected,
  type Selection,
} from '@/utils/subscribers'

export const dynamic = 'force-dynamic'

const SORTS: SubscriberSort[] = ['email', 'name', 'status', 'added', 'opened']

// A pasted list of a few thousand lines.
const MAX_BODY_BYTES = 2 * 1024 * 1024
const MAX_LIST = 5000
// Each one is an email sent while the request waits.
const MAX_CONFIRMATIONS = 25

function selectionOf(value: unknown): Selection | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (Array.isArray(raw.ids)) {
    const ids = raw.ids.map(positiveInteger)
    if (!ids.length || ids.length > 100000) return null
    return ids.every((id): id is number => id !== null) ? { ids } : null
  }
  if (raw.query && typeof raw.query === 'object') {
    return { query: queryOf(raw.query as Record<string, unknown>) }
  }
  return null
}

function listOf(value: unknown, max: number): NewSubscriber[] | null {
  if (!Array.isArray(value) || !value.length || value.length > max) return null
  return value.map((item) => {
    const raw = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    return {
      email: typeof raw.email === 'string' ? raw.email : '',
      firstName: typeof raw.firstName === 'string' ? raw.firstName : '',
      lastName: typeof raw.lastName === 'string' ? raw.lastName : '',
    }
  })
}

// Sends the confirmation emails, and counts the ones that went.
async function confirmAll(rows: { id: number; email: string; firstName: string }[]) {
  let sent = 0
  for (const row of rows) {
    const result = await sendConfirmation(row)
    if (result.ok) sent++
    else console.error(`A subscription confirmation was not sent: ${result.code}`)
  }
  return sent
}

// The mailing list, for the marketing dialog's Subscribers and Audience tabs: a page
// of it, or one subscriber with the campaigns they were sent.
export async function GET(req: NextRequest) {
  return adminRoute(req, async () => {
    const params = req.nextUrl.searchParams

    const id = positiveInteger(params.get('id'))
    if (id) {
      const subscriber = await getSubscriber(id)
      if (!subscriber) return problem('That subscriber was not found.', 404)
      return reply({ subscriber, history: await subscriberHistory(id) })
    }

    const list = await listSubscribers({
      ...queryOf({ status: params.get('status'), search: params.get('search') }),
      sort: SORTS.find((sort) => sort === params.get('sort')) ?? 'added',
      descending: params.get('dir') !== 'asc',
      page: positiveInteger(params.get('page') ?? '1') ?? 1,
    })
    return reply({ ...list, perPage: SUBSCRIBERS_PER_PAGE })
  })
}

// Changes to the list. Adding someone as subscribed takes the administrator's
// word that they asked for it, so it has to be said each time.
export async function POST(req: NextRequest) {
  return adminRoute(req, async () => {
    const input = await readInput(req, MAX_BODY_BYTES)
    if (input instanceof Response) return input

    switch (input.action) {
      case 'check': {
        const list = listOf(input.list, MAX_LIST)
        if (!list) return problem('Paste at least one address, and no more than 5,000 at a time.')
        return reply({ check: await checkSubscribers(list) })
      }

      case 'add': {
        const mode = input.mode === 'subscribed' ? 'subscribed' : 'confirm'
        const list = listOf(input.list, mode === 'confirm' ? MAX_CONFIRMATIONS : MAX_LIST)
        if (!list) return problem('Too many addresses in one request.')
        if (mode === 'subscribed' && input.consent !== true) {
          return problem('Confirm that these people asked to receive the emails.')
        }
        const added = await addSubscribers(list, mode)
        const confirmations = await confirmAll(added.toConfirm)
        return reply({ added: added.added, confirmations })
      }

      case 'unsubscribe':
      case 'resubscribe':
      case 'delete':
      case 'resend': {
        const selection = selectionOf(input.selection)
        if (!selection) return problem('Choose who to change.')

        if (input.action === 'unsubscribe') {
          return reply({ changed: await unsubscribeSelected(selection) })
        }
        if (input.action === 'delete') {
          return reply({ changed: await deleteSelected(selection) })
        }
        if (input.action === 'resubscribe') {
          if (input.consent !== true) {
            return problem('Confirm that these people asked to receive the emails again.')
          }
          return reply({
            changed: await resubscribeSelected(selection, input.includeComplaints === true),
          })
        }
        // A few at a time: the screen asks again until none are left.
        const pending = await pendingSelected(selection, MAX_CONFIRMATIONS + 1)
        const now = pending.slice(0, MAX_CONFIRMATIONS)
        return reply({ changed: await confirmAll(now), more: pending.length > now.length })
      }

      case 'rename': {
        const id = positiveInteger(input.id)
        if (!id) return problem('That subscriber was not found.', 404)
        await renameSubscriber(id, input.firstName, input.lastName)
        return reply({ subscriber: await getSubscriber(id) })
      }

      default:
        return problem('Unknown action')
    }
  })
}
