'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/button'
import { Paragraph } from '@/components/paragraph'
import { ACCOUNT_MESSAGES, type AccountFailure } from '@/utils/member-types'

type ConfirmLink = { i: string; e: string; t: string; s: string }

// The page the confirmation email links to. Pressing the button in the email
// is the confirmation: the page confirms as soon as it opens, with nothing
// more to press. A mail scanner that only fetches the link changes nothing,
// since the confirmation is sent by the page once it runs.
export function ConfirmSubscription() {
  const [link, setLink] = useState<ConfirmLink | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [problem, setProblem] = useState('')
  // React runs the opening effect twice in development; one request is enough.
  const started = useRef(false)

  const confirm = useCallback(async (target: ConfirmLink) => {
    setBusy(true)
    setProblem('')
    try {
      const response = await fetch('/api/newsletter/confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      })
      const data = (await response.json()) as { ok: true } | AccountFailure
      if (data.ok) setDone(true)
      else setProblem(data.message ?? ACCOUNT_MESSAGES.failed)
    } catch {
      setProblem(ACCOUNT_MESSAGES.failed)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (started.current) return
    started.current = true
    const params = new URLSearchParams(window.location.search)
    const found = {
      i: params.get('i') ?? '',
      e: params.get('e') ?? '',
      t: params.get('t') ?? '',
      s: params.get('s') ?? '',
    }
    setLink(found)
    // The address and the signature are not left in the history.
    if (params.size) window.history.replaceState(null, '', window.location.pathname)
    if (found.i && found.s) confirm(found)
  }, [confirm])

  if (!link) return null

  if (!link.i || !link.s) {
    return (
      <Paragraph>
        This link is missing its key. Please open the link from the email again, or sign up
        again from the sidebar.
      </Paragraph>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <Paragraph margin="mb-0">
          Thank you. You are subscribed, and each new essay will be sent to {link.e}.
        </Paragraph>
        <Paragraph margin="mb-0">
          <Link href="/" className="font-medium text-accent underline">
            Go to the latest essays
          </Link>
        </Paragraph>
      </div>
    )
  }

  if (problem) {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <Paragraph margin="mb-0" color="text-accent">
          {problem}
        </Paragraph>
        <Button
          onClick={() => confirm(link)}
          variant="outline"
          className="self-start !text-xs !px-4 !py-2"
        >
          {busy ? 'Trying again…' : 'Try again'}
        </Button>
      </div>
    )
  }

  return (
    <Paragraph role="status">
      Confirming your subscription for {link.e}…
    </Paragraph>
  )
}
