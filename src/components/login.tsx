'use client'

import { useState } from 'react'
import { Form, FormButton, FormFirstName, FormInput, FormLastName } from '@/components/form'
import { Modal } from '@/components/modal'
import { QuietButton } from '@/components/quiet-button'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import { state, useSnapshot } from '@/state'
import type { Member } from '@/utils/member-types'

type Mode = 'login' | 'forgot' | 'signup'

// The login dialog. Opened from the sidebar's Log in button, or from
// anywhere through state.loginOpen.
export default function LoginDialog() {
  const snap = useSnapshot(state)
  const [mode, setMode] = useState<Mode>('login')

  const close = () => {
    state.loginOpen = false
    setMode('login')
  }

  const loggedIn = (data: Record<string, unknown>) => {
    const member = data.member as Member | undefined
    if (member) state.member = member
    close()
  }

  return (
    <Modal
      open={snap.loginOpen}
      onClose={close}
      title={
        mode === 'login'
          ? 'Log in'
          : mode === 'forgot'
            ? 'Forgot your password?'
            : 'Create an account'
      }
    >
      {mode === 'login' ? (
        <Form
          key="login"
          gap="gap-3"
          action="/api/account/login/"
          onSuccess={loggedIn}
          resetOnSuccess={false}
        >
          <label htmlFor="login-name" className="sr-only">
            Email address or username
          </label>
          <FormInput
            id="login-name"
            name="login"
            placeholder="Email address or username"
            label="Login"
            autoComplete="username"
            required
          />
          <label htmlFor="login-password" className="sr-only">
            Password
          </label>
          <FormInput
            id="login-password"
            name="password"
            type="password"
            placeholder="Password"
            label="Password"
            autoComplete="current-password"
            required
          />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="remember"
              value="1"
              defaultChecked
              data-label="Remember me"
              className="h-4 w-4 appearance-none rounded border border-accent checked:bg-accent checked:border-accent focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer transition-colors"
            />
            <Span fontSize="text-xs">Remember me on this device</Span>
          </label>
          <FormButton
            name="submit"
            label="Log in"
            submitMessage="Logged in."
            className="!text-xs !px-4 !py-2"
          />
          <div className="flex flex-col gap-3">
            <QuietButton onClick={() => setMode('forgot')}>
              Forgot your password?
            </QuietButton>
            <QuietButton onClick={() => setMode('signup')}>
              Create an account
            </QuietButton>
          </div>
        </Form>
      ) : mode === 'signup' ? (
        <Form
          key="signup"
          gap="gap-3"
          honeypot
          action="/api/account/subscribe/"
          resetOnSuccess={false}
        >
          <Paragraph fontSize="text-xs" margin="mb-1">
            An account lets you comment under your own name. We will email you a
            link to confirm your address; nothing is created until you open it and
            choose a password.
          </Paragraph>
          <FormFirstName name="firstName" placeholder="First name" label="First name" />
          <FormLastName name="lastName" placeholder="Last name" label="Last name" />
          <label htmlFor="signup-email" className="sr-only">
            Email address
          </label>
          <FormInput
            id="signup-email"
            name="email"
            type="email"
            placeholder="Email address"
            label="Email"
            autoComplete="email"
            required
          />
          <FormButton
            name="submit"
            label="Create my account"
            submitMessage="Check your email for a link to confirm your address."
            className="!text-xs !px-4 !py-2"
          />
          <QuietButton onClick={() => setMode('login')}>Back to log in</QuietButton>
        </Form>
      ) : (
        <Form
          key="forgot"
          gap="gap-3"
          honeypot
          action="/api/account/forgot/"
          resetOnSuccess={false}
        >
          <Paragraph fontSize="text-xs" margin="mb-1">
            Enter your email address or username and we will send you a link to
            choose a new password.
          </Paragraph>
          <label htmlFor="forgot-login" className="sr-only">
            Email address or username
          </label>
          <FormInput
            id="forgot-login"
            name="login"
            placeholder="Email address or username"
            label="Login"
            autoComplete="username"
            required
          />
          <FormButton
            name="submit"
            label="Send the link"
            submitMessage="Check your email."
            className="!text-xs !px-4 !py-2"
          />
          <QuietButton onClick={() => setMode('login')}>Back to log in</QuietButton>
        </Form>
      )}
    </Modal>
  )
}
