'use client'

import clsx from 'clsx'
import { useCallback, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import {
  actionRowClass,
  Checkbox,
  mainButtonClass,
  plural,
  quietButtonClass,
} from '@/components/mailing/parts'
import { useDemo } from '@/hooks/use-demo'
import { MailingSessionExpired } from '@/hooks/use-mailing'
import {
  EMPTY_COUNTS,
  actOnSubscribers,
  type SubscriberAction,
  type SubscriberSelection,
} from '@/hooks/use-subscribers'
import type {
  SubscriberCounts,
  SubscriberRow,
  SubscriberStatusFilter,
} from '@/utils/mailing-types'
import { AddSubscribers } from './add-subscribers'
import { SubscriberDetail } from './subscriber-detail'
import { SubscriberTable } from './subscriber-table'

const ACTION_LABELS: Record<SubscriberAction, string> = {
  unsubscribe: 'Unsubscribe',
  resubscribe: 'Resubscribe',
  delete: 'Delete',
  resend: 'Resend confirmation',
}

// What pressing an action asks first.
const ACTION_WARNINGS: Record<SubscriberAction, string> = {
  unsubscribe: 'They stay on the list as unsubscribed, so they are never sent another campaign.',
  resubscribe:
    'They will get the next campaign. Only do this if they asked to be subscribed again. Anyone who reported a message as spam is left alone unless you tick the box below.',
  delete:
    'They are removed for good. If someone unsubscribed, deleting them loses the record that they did, and their address could be added again later. Unsubscribe them instead unless you are sure.',
  resend: 'Anyone selected who is still waiting to confirm is sent the confirmation email again.',
}

// The mailing list, for an administrator, as the Subscribers tab of the
// marketing dialog: who is on it, adding people one at
// a time or as a list, and unsubscribing, resubscribing or deleting them.
export function SubscribersManager({ onExpired }: { onExpired: () => void }) {
  const { demo } = useDemo()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [allMatching, setAllMatching] = useState(false)
  const [selection, setSelection] = useState<{ value: SubscriberSelection | null; count: number }>({
    value: null,
    count: 0,
  })
  const [counts, setCounts] = useState<SubscriberCounts>(EMPTY_COUNTS)
  const [filter, setFilter] = useState<{ status: SubscriberStatusFilter; search: string }>({
    status: 'all',
    search: '',
  })
  const [version, setVersion] = useState(0)
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<SubscriberRow | null>(null)
  const [action, setAction] = useState<SubscriberAction | null>(null)
  const [consent, setConsent] = useState(false)
  const [includeComplaints, setIncludeComplaints] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')

  const expire = onExpired

  const onSelectionChange = useCallback((value: SubscriberSelection | null, count: number) => {
    setSelection({ value, count })
  }, [])

  const refresh = () => setVersion((v) => v + 1)

  const run = async () => {
    if (!action || !selection.value) return
    setBusy(true)
    setProblem('')
    try {
      const changed = await actOnSubscribers(action, selection.value, {
        consent,
        includeComplaints,
      })
      setNotice(
        action === 'resend'
          ? `${plural(changed, 'confirmation email')} sent.`
          : `${ACTION_LABELS[action]}: ${plural(changed, 'person')} changed.`
      )
      setSelected(new Set())
      setAllMatching(false)
      setAction(null)
      refresh()
    } catch (error) {
      if (error instanceof MailingSessionExpired) expire()
      else setProblem((error as Error).message || 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  // Everyone matching the filter on screen, ticked or not.
  const exportCsv = async () => {
    if (!demo) {
      window.location.href = `/api/mailing/subscribers/export/?${new URLSearchParams(filter)}`
      return
    }
    // The demo's own made-up list, as a file of the same shape.
    const { demoSubscribersCsv } = await import('@/utils/demo-api')
    const csv = await demoSubscribersCsv(filter)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'subscribers-demo.csv'
    link.click()
    // Later, or some browsers cancel the download it has just started.
    setTimeout(() => URL.revokeObjectURL(link.href), 60000)
  }

  return (
    <div className="flex flex-col gap-3 sm:h-full sm:min-h-0">
      <div className={actionRowClass}>
        <Span fontSize="text-sm" fontWeight="font-semibold">
          {plural(counts.subscribed, 'subscriber')}
        </Span>
        <Span fontSize="text-xs" color="text-contrast-light">
          {counts.pending ? `${counts.pending.toLocaleString()} waiting to confirm · ` : ''}
          {counts.all.toLocaleString()} on the list in all
        </Span>
        <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:flex-wrap">
          <button type="button" className={quietButtonClass} onClick={exportCsv}>
            Export {filter.status === 'all' && !filter.search ? 'all' : 'these'} as CSV
          </button>
          <button type="button" className={mainButtonClass} onClick={() => setAdding(true)}>
            Add subscribers
          </button>
        </div>
      </div>

      <div className={clsx(actionRowClass, 'min-h-12 rounded-md bg-accent/5 px-3 py-2')}>
        <Span fontSize="text-xs" fontWeight="font-semibold">
          {selection.count ? `${plural(selection.count, 'person')} selected` : 'Tick people to change them'}
        </Span>
        {(Object.keys(ACTION_LABELS) as SubscriberAction[]).map((name) => (
          <button
            key={name}
            type="button"
            className={quietButtonClass}
            disabled={!selection.count || busy}
            onClick={() => {
              setAction(name)
              setConsent(false)
              setIncludeComplaints(false)
              setNotice('')
            }}
          >
            {ACTION_LABELS[name]}
          </button>
        ))}
      </div>

      <div role="status" aria-live="polite">
        {notice && (
          <Paragraph margin="mb-0" fontSize="text-xs">
            {notice}
          </Paragraph>
        )}
        {problem && (
          <Paragraph margin="mb-0" fontSize="text-xs" color="text-accent">
            {problem}
          </Paragraph>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <SubscriberTable
          mode="manage"
          selected={selected}
          onSelectedChange={setSelected}
          allMatching={allMatching}
          onAllMatchingChange={setAllMatching}
          onSelectionChange={onSelectionChange}
          onCounts={setCounts}
          onFilter={setFilter}
          onOpen={setOpen}
          onExpired={expire}
          version={version}
        />
      </div>

      <AddSubscribers
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={refresh}
        onExpired={expire}
      />

      <SubscriberDetail
        subscriber={open}
        onClose={() => setOpen(null)}
        onChanged={refresh}
        onExpired={expire}
      />

      <Dialog open={action !== null} onClose={() => !busy && setAction(null)} className="relative z-50">
        <div className="fixed inset-0 bg-overlay/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-lg bg-body p-6 shadow-lg">
            {action && (
              <>
                <DialogTitle as={Paragraph} margin="mb-0" fontWeight="font-semibold">
                  {ACTION_LABELS[action]} {plural(selection.count, 'person')}?
                </DialogTitle>
                <Paragraph margin="mb-0" fontSize="text-xs">
                  {ACTION_WARNINGS[action]}
                </Paragraph>
                {action === 'resubscribe' && (
                  <div className="flex flex-col gap-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        label="They asked to be subscribed again"
                        checked={consent}
                        onChange={(checked) => setConsent(checked)}
                      />
                      <Span fontSize="text-xs">They asked to be subscribed again.</Span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        label="Include those who reported spam"
                        checked={includeComplaints}
                        onChange={(checked) => setIncludeComplaints(checked)}
                      />
                      <Span fontSize="text-xs">
                        Include anyone who reported a message as spam. Mailing them again is the
                        quickest way to have the site’s email blocked.
                      </Span>
                    </label>
                  </div>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" className={quietButtonClass} disabled={busy} onClick={() => setAction(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={mainButtonClass}
                    disabled={busy || (action === 'resubscribe' && !consent)}
                    onClick={run}
                  >
                    {busy ? 'Working…' : ACTION_LABELS[action]}
                  </button>
                </div>
              </>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}
