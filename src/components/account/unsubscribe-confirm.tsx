'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/button'
import { Paragraph } from '@/components/paragraph'

// The page the unsubscribe link in a mailing opens. Nothing happens until
// the button is pressed: a mail scanner that opens the link changes nothing.
export function UnsubscribeConfirm() {
  // The signed link, kept as it arrived: it is what says whose request this is.
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [problem, setProblem] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const recipient = params.get('r') ?? ''
    const signature = params.get('s') ?? ''
    setLink(
      recipient && signature
        ? `r=${encodeURIComponent(recipient)}&s=${encodeURIComponent(signature)}`
        : ''
    )
  }, [])

  const unsubscribe = async () => {
    if (!link || busy) return
    setBusy(true)
    setProblem('')
    try {
      const response = await fetch(`/api/email/unsubscribe/?${link}`, { method: 'POST' })
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean
        message?: string
      } | null
      if (response.ok && data?.ok) setDone(true)
      else setProblem(data?.message ?? 'That did not work. Please try again.')
    } catch {
      setProblem('That did not work. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (link === null) return null

  if (!link) {
    return (
      <Paragraph>
        This link is missing its key. Please use the unsubscribe link at the
        bottom of the email again.
      </Paragraph>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <Paragraph margin="mb-0">
          You are unsubscribed. No more essays will be sent to this address.
        </Paragraph>
        <Paragraph margin="mb-0">
          Changed your mind? Log in and switch email back on in{' '}
          <Link href="/account/" className="font-medium text-accent underline">
            your profile
          </Link>
          .
        </Paragraph>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <Paragraph margin="mb-0">
        Press the button to stop receiving new essays by email.
      </Paragraph>
      <Button onClick={unsubscribe} className="self-start !text-xs !px-4 !py-2">
        {busy ? 'Unsubscribing…' : 'Unsubscribe'}
      </Button>
      {problem && (
        <Paragraph margin="mb-0" color="text-accent">
          {problem}
        </Paragraph>
      )}
    </div>
  )
}
