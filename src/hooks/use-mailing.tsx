'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEMO_ENABLED } from '@/hooks/use-demo'
import { state } from '@/state'
import type { Campaign } from '@/utils/mailing-types'

// The session is no longer an administrator's. The screen closes and the
// member is logged out.
export class MailingSessionExpired extends Error {}

const BUSY_RETRIES = 5

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// One call to a route under /api/mailing. WordPress refusing because it is
// busy is waited out and tried again. So is a first 401: the login check
// asks WordPress too, and fails the same way when WordPress is busy.
export async function mailingCall<T>(
  url: string,
  options: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  // The demo toolbar, for someone who is not an administrator: answered in
  // the browser from made-up data, never by the real routes.
  if (
    DEMO_ENABLED &&
    state.demo &&
    state.memberLoaded &&
    !state.member?.isAdmin
  ) {
    const { demoCall } = await import('@/utils/demo-api')
    return demoCall<T>(url, options)
  }

  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST')
  let refused = false

  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      method,
      cache: 'no-store',
      ...(method === 'GET'
        ? {}
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options.body ?? {}),
          }),
    })
    const json = await response.json().catch(() => ({}))
    if (response.ok) return json as T

    if (response.status === 401) {
      if (refused) throw new MailingSessionExpired()
      refused = true
      await wait(3000)
      continue
    }

    const busy = response.status === 503 || response.status === 429
    if (busy && attempt < BUSY_RETRIES) {
      await wait(Math.min(Number(json?.retryAfter) || 5, 30) * 1000)
      continue
    }

    throw new Error(
      busy
        ? 'WordPress is busy. Try again in a minute.'
        : json?.message || `The server answered ${response.status}.`
    )
  }
}

export type SendPhase =
  | 'idle'
  | 'sending'
  // Stopped part way: by the administrator, or by Cloudflare's daily limit.
  // Resuming sends only to those not yet sent to.
  | 'paused'
  | 'done'
  | 'error'
  | 'expired'

type SendAnswer = {
  campaign: Campaign
  done?: boolean
  paused?: boolean
  retryAfter?: number
}

// Sends a campaign a few emails at a time, one call after another, and
// reports how far along it is. The page has to stay open while it runs;
// closing it leaves the campaign paused, with nobody sent to twice.
export function useCampaignSend() {
  const [phase, setPhase] = useState<SendPhase>('idle')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [message, setMessage] = useState('')
  const stopping = useRef(false)
  const running = useRef(false)

  useEffect(
    () => () => {
      stopping.current = true
    },
    []
  )

  const start = useCallback(async (campaignId: number) => {
    if (running.current) return
    running.current = true
    stopping.current = false
    setMessage('')
    setPhase('sending')

    const url = `/api/mailing/campaigns/${campaignId}/send/`
    try {
      for (;;) {
        if (stopping.current) {
          const paused = await mailingCall<SendAnswer>(url, {
            body: { action: 'pause' },
          })
          setCampaign(paused.campaign)
          setMessage('Paused. Resume to send to everyone not yet sent to.')
          setPhase('paused')
          return
        }

        const result = await mailingCall<SendAnswer>(url, {
          body: { action: 'send' },
        })
        setCampaign(result.campaign)

        if (result.paused) {
          setMessage(result.campaign.pauseReason)
          setPhase('paused')
          return
        }
        if (result.done) {
          const stuck = result.campaign.status !== 'sent'
          setMessage(stuck ? result.campaign.pauseReason : '')
          setPhase(stuck ? 'paused' : 'done')
          return
        }
        if (result.retryAfter) await wait(result.retryAfter * 1000)
      }
    } catch (caught) {
      if (caught instanceof MailingSessionExpired) {
        setMessage('Session expired. Log in again, then resume.')
        setPhase('expired')
      } else {
        setMessage((caught as Error).message || 'Sending stopped.')
        setPhase('error')
      }
    } finally {
      running.current = false
    }
  }, [])

  // Stops after the emails in flight.
  const pause = useCallback(() => {
    stopping.current = true
  }, [])

  const reset = useCallback(() => {
    setPhase('idle')
    setCampaign(null)
    setMessage('')
  }, [])

  return { phase, campaign, message, start, pause, reset }
}
