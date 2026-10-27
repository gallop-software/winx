// What the browser knows about a member. Shared by the routes under
// /api/account and the components that show a member.

// The member as the session cookie carries them: enough for the sidebar
// card and to decide what to show. Never the email address.
export type Member = {
  id: number
  name: string
  avatar: string
  isAdmin: boolean
  subscribed: boolean
}

// The member as the profile page shows them.
export type MemberProfile = Member & {
  username: string
  firstName: string
  lastName: string
  email: string
  replyEmails: boolean
  verified: boolean
}

export type AccountErrorCode =
  | 'rejected'
  | 'invalid_credentials'
  | 'invalid_email'
  | 'invalid_name'
  | 'weak_password'
  | 'wrong_password'
  | 'email_taken'
  | 'exists'
  | 'link_invalid'
  | 'too_fast'
  | 'session_expired'
  | 'unavailable'
  | 'failed'

export type AccountFailure = {
  ok: false
  code: AccountErrorCode
  message: string
  retryAfter?: number
}

export const ACCOUNT_MESSAGES: Record<AccountErrorCode, string> = {
  rejected: 'That request could not be accepted.',
  invalid_credentials: 'The email address or password is not right.',
  invalid_email: 'Please enter a valid email address.',
  invalid_name: 'Please enter a name.',
  weak_password: 'Please choose a password of at least 8 characters.',
  wrong_password: 'Your current password is not right.',
  email_taken: 'That email address is already in use.',
  exists: 'You already have an account with that email address. Please log in.',
  link_invalid:
    'This link has expired or was already used. Please ask for a new one.',
  too_fast: 'Too many attempts. Please wait a few minutes and try again.',
  session_expired: 'Please log in again.',
  unavailable: 'Accounts are not available right now. Please try again later.',
  failed: 'Something went wrong. Please try again.',
}

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const NAME_MAX_LENGTH = 100
