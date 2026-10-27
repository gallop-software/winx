'use client'

import { useEffect, useState } from 'react'
import { MailingSessionExpired, mailingCall } from '@/hooks/use-mailing'

// Reads a route of the FlowTrace box, as the analytics tabs do: what was read
// and what it was read for, so a slow answer to an older question never
// shows. `waiting` is true until the answer to the latest one is in. A new
// `refreshed` reads the same address again (the box's Refresh). Through
// mailingCall(), so the toolbar's demo answers it from made-up data.
export function useFlowTraceRead<T>(
  address: string | null,
  onExpired: () => void,
  refreshed = 0
) {
  const wanted = address === null ? null : `${address}#${refreshed}`
  const [read, setRead] = useState<{ wanted: string; value: T } | null>(null)
  const [problem, setProblem] = useState<{
    wanted: string
    message: string
  } | null>(null)

  useEffect(() => {
    if (!wanted || address === null) return
    let stale = false
    mailingCall<T>(address)
      .then((value) => {
        if (!stale) setRead({ wanted, value })
      })
      .catch((error: unknown) => {
        if (stale) return
        if (error instanceof MailingSessionExpired) onExpired()
        else
          setProblem({
            wanted,
            message: (error as Error).message || 'Something went wrong.',
          })
      })
    return () => {
      stale = true
    }
  }, [address, wanted, onExpired])

  return {
    value: read?.wanted === wanted ? read.value : (read?.value ?? null),
    waiting: read?.wanted !== wanted && problem?.wanted !== wanted,
    problem: problem?.wanted === wanted ? problem.message : '',
  }
}
