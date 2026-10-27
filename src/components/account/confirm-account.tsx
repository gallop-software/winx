'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/button'
import { Form, FormButton, FormInput } from '@/components/form'
import { Paragraph } from '@/components/paragraph'
import { useMember } from '@/hooks/use-member'
import { state } from '@/state'
import {
  ACCOUNT_MESSAGES,
  type AccountErrorCode,
  type AccountFailure,
  type Member,
} from '@/utils/member-types'
import { takeConfirmLink, type ConfirmLink } from './link-params'

type Outcome = {
  loggedIn: boolean
  existing: boolean
  member?: Member
}

// An account does not subscribe anyone to the emails. A new member is offered
// them once, here, with one click.
function SubscribeOffer() {
  const [step, setStep] = useState<'offer' | 'saving' | 'done' | 'failed'>('offer')

  const subscribe = async () => {
    setStep('saving')
    try {
      const response = await fetch('/api/account/profile/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribed: 'true' }),
      })
      const data = (await response.json()) as { member?: Member }
      if (!response.ok || !data.member) throw new Error()
      state.member = data.member
      setStep('done')
    } catch {
      setStep('failed')
    }
  }

  if (step === 'done') {
    return <Paragraph margin="mb-0">You are subscribed to new essays by email.</Paragraph>
  }

  return (
    <div className="flex flex-col gap-2">
      <Paragraph margin="mb-0">Would you also like each new essay by email?</Paragraph>
      <Button
        onClick={subscribe}
        variant="outline"
        className="self-start !text-xs !px-4 !py-2"
      >
        {step === 'saving' ? 'Subscribing…' : 'Yes, email me new essays'}
      </Button>
      {step === 'failed' && (
        <Paragraph margin="mb-0" color="text-accent">
          That did not work. You can subscribe from the card in the sidebar.
        </Paragraph>
      )}
    </div>
  )
}

// The page a confirmation email links to. Nothing happens until the form is
// sent or the button pressed: a mail scanner that opens the link changes
// nothing.
//
// A sign-up link asks for a password, and sending it is what creates the
// account. A link WordPress emailed, to a member who changed their address,
// only has a button.
export function ConfirmAccount() {
  const { openLogin } = useMember()
  const [link, setLink] = useState<ConfirmLink | null>(null)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [problem, setProblem] = useState('')
  const [refusal, setRefusal] = useState<AccountErrorCode | ''>('')

  useEffect(() => {
    setLink(takeConfirmLink())
  }, [])

  const confirm = async () => {
    if (link?.kind !== 'existing' || busy) return
    setBusy(true)
    setProblem('')
    try {
      const response = await fetch('/api/account/confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link.id, key: link.key }),
      })
      const data = (await response.json()) as (Outcome & { ok: true }) | AccountFailure
      if (!data.ok) {
        setProblem(data.message ?? ACCOUNT_MESSAGES.failed)
        return
      }
      if (data.member) state.member = data.member
      setOutcome(data)
    } catch {
      setProblem(ACCOUNT_MESSAGES.failed)
    } finally {
      setBusy(false)
    }
  }

  if (!link) return null

  if (link.kind === 'none') {
    return (
      <Paragraph>
        This link is missing its key. Please open the link from the email
        again, or ask for a new one.
      </Paragraph>
    )
  }

  if (!outcome && link.kind === 'signup') {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <Paragraph margin="mb-0">
          Choose a password of at least 8 characters to finish creating your
          account for {link.e}.
        </Paragraph>
        <Form
          gap="gap-3"
          action="/api/account/confirm/"
          resetOnSuccess={false}
          onSuccess={(data) => {
            const member = data.member as Member | undefined
            if (member) state.member = member
            setOutcome({ loggedIn: true, existing: false, ...(member ? { member } : {}) })
          }}
          onFailure={(data) => setRefusal((data.code as AccountErrorCode | undefined) ?? '')}
        >
          <input type="hidden" name="e" value={link.e} />
          <input type="hidden" name="f" value={link.f} />
          <input type="hidden" name="l" value={link.l} />
          <input type="hidden" name="t" value={link.t} />
          <input type="hidden" name="s" value={link.s} />
          <label htmlFor="confirm-password" className="sr-only">
            Password
          </label>
          <FormInput
            id="confirm-password"
            name="password"
            type="password"
            placeholder="Password"
            label="Password"
            autoComplete="new-password"
            required
          />
          <FormButton
            name="submit"
            label="Create my account"
            submitMessage="Your account is ready."
            className="!text-xs !px-4 !py-2 self-start"
          />
        </Form>
        {refusal === 'exists' && (
          <Paragraph margin="mb-0">
            <button
              type="button"
              onClick={openLogin}
              className="font-medium text-accent underline cursor-pointer"
            >
              Log in
            </button>{' '}
            with your password, or choose &ldquo;Forgot your password?&rdquo;
            there for a new one.
          </Paragraph>
        )}
        {refusal === 'link_invalid' && (
          <Paragraph margin="mb-0">
            <button
              type="button"
              onClick={openLogin}
              className="font-medium text-accent underline cursor-pointer"
            >
              Open the log in window
            </button>{' '}
            and choose &ldquo;Create an account&rdquo; to be sent a new link.
          </Paragraph>
        )}
      </div>
    )
  }

  if (!outcome) {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <Paragraph margin="mb-0">
          Press the button to confirm your email address.
        </Paragraph>
        <Button onClick={confirm} className="self-start !text-xs !px-4 !py-2">
          {busy ? 'Confirming…' : 'Confirm my email address'}
        </Button>
        {problem && (
          <Paragraph margin="mb-0" color="text-accent">
            {problem}
          </Paragraph>
        )}
      </div>
    )
  }

  if (!outcome.loggedIn) {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <Paragraph margin="mb-0">
          Thank you, your email address is confirmed.
        </Paragraph>
        <Paragraph margin="mb-0">
          <button
            type="button"
            onClick={openLogin}
            className="font-medium text-accent underline cursor-pointer"
          >
            Log in
          </button>{' '}
          to manage your preferences.
        </Paragraph>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <Paragraph margin="mb-0">
        Welcome{outcome.member ? `, ${outcome.member.name}` : ''}. Your account is
        ready and you are logged in.
      </Paragraph>

      <SubscribeOffer />

      <Paragraph margin="mb-0">
        <Link href="/" className="font-medium text-accent underline">
          Go to the latest essays
        </Link>
        {' · '}
        <Link href="/account/" className="font-medium text-accent underline">
          Edit your profile
        </Link>
      </Paragraph>
    </div>
  )
}
