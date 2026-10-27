import type { NextRequest } from 'next/server'
import {
  FAILURE_STATUS,
  addressOf,
  answer,
  fieldOf,
  limit,
  limitTotal,
  readForm,
  refuse,
} from '@/utils/account-route'
import {
  clearSessionCookie,
  issueSession,
  readSession,
  setSessionCookie,
  toMember,
} from '@/utils/member-session'
import {
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/utils/member-types'
import {
  getMember,
  isMembersConfigured,
  toProfile,
  updateMember,
  type ProfileChanges,
} from '@/utils/members'
import { sendConfirmation } from '@/utils/newsletter'
import { inboxOf, isEmail } from '@/utils/send-email'
import {
  isMemberSubscribed,
  moveMemberEmail,
  setMemberSubscription,
} from '@/utils/subscribers'

export const dynamic = 'force-dynamic'

// The profile page. Reading asks WordPress for the member as they are now,
// with the email; saving sends the changes and re-issues the session, since
// the name, avatar, or session version may have changed.
//
// "Email me new essays" is not WordPress's: it is the member's row on the
// mailing list, read and written here by their account and address. The
// member card's Subscribe button posts it on its own.
//
// A session WordPress no longer accepts is removed from the browser.

function expired() {
  const response = refuse('session_expired', 401)
  clearSessionCookie(response)
  return response
}

export async function GET(req: NextRequest) {
  if (!isMembersConfigured()) return refuse('unavailable', 503)

  const session = await readSession(req)
  if (!session) return refuse('session_expired', 401)

  const result = await getMember(session.id, session.version)
  if (!result.ok) {
    if (result.code === 'session_expired') return expired()
    return refuse(result.code, FAILURE_STATUS[result.code])
  }

  return answer({
    profile: {
      ...toProfile(result.value),
      subscribed: await isMemberSubscribed(session.id),
    },
  })
}

export async function POST(req: NextRequest) {
  if (!isMembersConfigured()) return refuse('unavailable', 503)

  const session = await readSession(req)
  if (!session) return refuse('session_expired', 401)

  const input = await readForm(req)
  if (input instanceof Response) return input

  const changes: ProfileChanges = {}

  if (input.displayName !== undefined) {
    const name = fieldOf(input, 'displayName')
    if (!name || name.length > NAME_MAX_LENGTH)
      return refuse('invalid_name', 422)
    changes.displayName = name
  }
  if (input.firstName !== undefined) {
    changes.firstName = fieldOf(input, 'firstName').slice(0, NAME_MAX_LENGTH)
  }
  if (input.lastName !== undefined) {
    changes.lastName = fieldOf(input, 'lastName').slice(0, NAME_MAX_LENGTH)
  }
  if (input.email !== undefined) {
    const email = fieldOf(input, 'email')
    if (!email || email.length > 254 || !isEmail(email)) {
      return refuse('invalid_email', 422)
    }
    changes.email = email
  }
  if (input.newPassword !== undefined && fieldOf(input, 'newPassword') !== '') {
    const password = fieldOf(input, 'newPassword')
    if (
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      return refuse('weak_password', 422)
    }
    changes.newPassword = password
  }
  if (input.currentPassword !== undefined) {
    changes.currentPassword = fieldOf(input, 'currentPassword').slice(0, 4096)
  }
  const wantsEmail =
    input.subscribed === undefined
      ? undefined
      : fieldOf(input, 'subscribed') === 'true'
  if (input.replyEmails !== undefined) {
    changes.replyEmails = fieldOf(input, 'replyEmails') === 'true'
  }

  // Only the subscription changed: WordPress is asked for the address, and
  // nothing is written there.
  const result = Object.keys(changes).length
    ? await updateMember(session.id, session.version, changes)
    : await getMember(session.id, session.version)
  if (!result.ok) {
    if (result.code === 'session_expired') return expired()
    return refuse(result.code, FAILURE_STATUS[result.code])
  }
  const saved = result.value

  // Their subscription follows them to a new address.
  if (changes.email && saved.email)
    await moveMemberEmail(session.id, saved.email)

  let newsletter: 'pending' | 'blocked' | undefined
  // A member whose address is not confirmed is sent a confirmation for
  // each Subscribe, so it has the sign-up form's limits.
  if (wantsEmail && saved.email && !saved.verified) {
    const ip = addressOf(req)
    if (ip instanceof Response) return ip
    const refused =
      (await limit('newsletter', ip, inboxOf(saved.email))) ??
      (await limitTotal('confirm-total'))
    if (refused) return refused
  }
  if (wantsEmail !== undefined && saved.email) {
    const outcome = await setMemberSubscription({
      userId: session.id,
      email: saved.email,
      firstName: saved.firstName,
      lastName: saved.lastName,
      verified: saved.verified,
      subscribed: wantsEmail,
    })
    if ('blocked' in outcome && outcome.blocked) newsletter = 'blocked'
    if (outcome.pending) {
      const sent = await sendConfirmation(outcome)
      if (!sent.ok)
        console.error(`A subscription confirmation was not sent: ${sent.code}`)
      newsletter = 'pending'
    }
  }

  const { value, session: next } = await issueSession(saved, session.remember)
  const subscribed = await isMemberSubscribed(session.id)
  const response = answer({
    profile: { ...toProfile(saved), subscribed },
    member: { ...toMember(next), subscribed },
    ...(newsletter
      ? {
          newsletter,
          message:
            newsletter === 'blocked'
              ? 'Saved. Essays cannot be emailed to this address: mail to it bounced or was reported as spam. Change your email address to subscribe.'
              : 'Check your email: confirm your new address to get the essays there.',
        }
      : {}),
  })
  setSessionCookie(response, value, next)
  return response
}
