'use client'

import { useEffect, useState } from 'react'
import { Form, FormButton, FormInput } from '@/components/form'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import { useMember } from '@/hooks/use-member'
import { state } from '@/state'
import type { Member, MemberProfile } from '@/utils/member-types'

// One switch: a hidden "false" first, so an unticked box is still sent.
function Switch({
  name,
  label,
  checked,
}: {
  name: string
  label: string
  checked: boolean
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="hidden" name={name} value="false" />
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={checked}
        data-label={label}
        className="h-4 w-4 appearance-none rounded border border-accent checked:bg-accent checked:border-accent focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer transition-colors"
      />
      <Span fontSize="text-xs">{label}</Span>
    </label>
  )
}

// The profile page: what WordPress has for the member now, and a form to
// change it. Saving re-issues the session, so the card in the sidebar
// follows.
export function ProfileForm() {
  const { member, loaded, logOut, openLogin } = useMember()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [problem, setProblem] = useState('')
  const memberId = member?.id

  useEffect(() => {
    if (!loaded || !memberId) return
    let cancelled = false
    fetch('/api/account/profile/', { cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json()) as {
          profile?: MemberProfile
          message?: string
        }
        if (cancelled) return
        if (response.status === 401) {
          await logOut()
          return
        }
        if (!response.ok || !data.profile) {
          setProblem(data.message ?? 'Your profile could not be loaded.')
          return
        }
        setProfile(data.profile)
      })
      .catch(() => {
        if (!cancelled) setProblem('Your profile could not be loaded.')
      })
    return () => {
      cancelled = true
    }
  }, [loaded, memberId, logOut])

  if (!loaded) return null

  if (!member) {
    return (
      <Paragraph>
        <button
          type="button"
          onClick={openLogin}
          className="font-medium text-accent underline cursor-pointer"
        >
          Log in
        </button>{' '}
        to see your profile.
      </Paragraph>
    )
  }

  if (problem) return <Paragraph>{problem}</Paragraph>
  if (!profile) return <Paragraph>Loading…</Paragraph>

  const saved = (data: Record<string, unknown>) => {
    const next = data.member as Member | undefined
    if (next) state.member = next
    const updated = data.profile as MemberProfile | undefined
    if (updated) setProfile(updated)
  }

  return (
    <div className="flex flex-col gap-10 max-w-xl">
      {!profile.verified && (
        <Paragraph margin="mb-0" color="text-contrast-light" fontSize="text-sm">
          Your email address has not been confirmed yet. Check your inbox for
          the link we sent.
        </Paragraph>
      )}

      <section>
        <Heading as="h2" margin="mb-4">
          Your details
        </Heading>
        <Form
          key={`details-${profile.id}`}
          gap="gap-3"
          action="/api/account/profile/"
          onSuccess={saved}
          resetOnSuccess={false}
        >
          <label htmlFor="profile-display-name" className="sr-only">
            Name shown with your comments
          </label>
          <FormInput
            id="profile-display-name"
            name="displayName"
            placeholder="Name shown with your comments"
            label="Display name"
            autoComplete="nickname"
            defaultValue={profile.name}
            required
          />
          <div className="flex flex-col md:flex-row gap-3">
            <label htmlFor="profile-first-name" className="sr-only">
              First name
            </label>
            <FormInput
              id="profile-first-name"
              name="firstName"
              placeholder="First name"
              label="First name"
              autoComplete="given-name"
              defaultValue={profile.firstName}
            />
            <label htmlFor="profile-last-name" className="sr-only">
              Last name
            </label>
            <FormInput
              id="profile-last-name"
              name="lastName"
              placeholder="Last name"
              label="Last name"
              autoComplete="family-name"
              defaultValue={profile.lastName}
            />
          </div>
          <Switch
            name="subscribed"
            label="Email me new essays"
            checked={profile.subscribed}
          />
          <Switch
            name="replyEmails"
            label="Email me when someone replies to my comment"
            checked={profile.replyEmails}
          />
          <FormButton
            name="submit"
            label="Save"
            submitMessage="Saved."
            className="!text-xs !px-4 !py-2 self-start"
          />
        </Form>
      </section>

      <section>
        <Heading as="h2" margin="mb-2">
          Email address
        </Heading>
        <Paragraph fontSize="text-sm" margin="mb-4" color="text-contrast-light">
          Changing it needs your current password, and the new address has to
          be confirmed before it is used.
        </Paragraph>
        <Form
          key={`email-${profile.email}`}
          gap="gap-3"
          action="/api/account/profile/"
          onSuccess={saved}
          resetOnSuccess={false}
        >
          <label htmlFor="profile-email" className="sr-only">
            Email address
          </label>
          <FormInput
            id="profile-email"
            name="email"
            type="email"
            placeholder="Email address"
            label="Email"
            autoComplete="email"
            defaultValue={profile.email}
            required
          />
          <label htmlFor="profile-email-password" className="sr-only">
            Current password
          </label>
          <FormInput
            id="profile-email-password"
            name="currentPassword"
            type="password"
            placeholder="Current password"
            label="Current password"
            autoComplete="current-password"
            required
          />
          <FormButton
            name="submit"
            label="Change email address"
            submitMessage="Saved. Check your new address for a link to confirm it."
            className="!text-xs !px-4 !py-2 self-start"
          />
        </Form>
      </section>

      <section>
        <Heading as="h2" margin="mb-2">
          Password
        </Heading>
        <Paragraph fontSize="text-sm" margin="mb-4" color="text-contrast-light">
          At least 8 characters. Changing it logs you out everywhere else.
        </Paragraph>
        <Form
          key="password"
          gap="gap-3"
          action="/api/account/profile/"
          onSuccess={saved}
        >
          <label htmlFor="profile-current-password" className="sr-only">
            Current password
          </label>
          <FormInput
            id="profile-current-password"
            name="currentPassword"
            type="password"
            placeholder="Current password"
            label="Current password"
            autoComplete="current-password"
            required
          />
          <label htmlFor="profile-new-password" className="sr-only">
            New password
          </label>
          <FormInput
            id="profile-new-password"
            name="newPassword"
            type="password"
            placeholder="New password"
            label="New password"
            autoComplete="new-password"
            required
          />
          <FormButton
            name="submit"
            label="Change password"
            submitMessage="Password changed."
            className="!text-xs !px-4 !py-2 self-start"
          />
        </Form>
      </section>

      <section>
        <Paragraph fontSize="text-sm" margin="mb-0" color="text-contrast-light">
          Logged in as {profile.username}.{' '}
          <button
            type="button"
            onClick={logOut}
            className="font-medium text-accent underline cursor-pointer"
          >
            Log out
          </button>{' '}
          of this browser.
        </Paragraph>
      </section>
    </div>
  )
}
