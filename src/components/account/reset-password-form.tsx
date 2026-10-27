'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Form, FormButton, FormInput } from '@/components/form'
import { Paragraph } from '@/components/paragraph'
import { state } from '@/state'
import type { Member } from '@/utils/member-types'
import { takeLinkParams } from './link-params'

// The page a password reset email links to. The key is only sent when the
// form is, so a mail scanner that opens the link uses nothing up.
export function ResetPasswordForm() {
  const [link, setLink] = useState<{ id: string; key: string } | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    setLink(takeLinkParams())
  }, [])

  if (!link) return null

  if (!link.id || !link.key) {
    return (
      <Paragraph>
        This link is missing its key. Please open the link from the email
        again, or ask for a new one with &ldquo;Forgot your password?&rdquo;.
      </Paragraph>
    )
  }

  if (done) {
    return (
      <Paragraph>
        Your password is set and you are logged in.{' '}
        <Link href="/" className="font-medium text-accent underline">
          Go to the latest essays
        </Link>
        .
      </Paragraph>
    )
  }

  return (
    <div className="max-w-xl">
      <Paragraph margin="mb-4">
        Choose a new password of at least 8 characters.
      </Paragraph>
      <Form
        gap="gap-3"
        action="/api/account/reset/"
        onSuccess={(data) => {
          const member = data.member as Member | undefined
          if (member) state.member = member
          setDone(true)
        }}
      >
        <input type="hidden" name="id" value={link.id} />
        <input type="hidden" name="key" value={link.key} />
        <label htmlFor="reset-password" className="sr-only">
          New password
        </label>
        <FormInput
          id="reset-password"
          name="password"
          type="password"
          placeholder="New password"
          label="New password"
          autoComplete="new-password"
          required
        />
        <FormButton
          name="submit"
          label="Set password"
          submitMessage="Password set."
          className="!text-xs !px-4 !py-2 self-start"
        />
      </Form>
    </div>
  )
}
