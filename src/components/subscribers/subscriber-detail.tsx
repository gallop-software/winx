'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import xMarkIcon from '@iconify/icons-heroicons/x-mark'
import { Heading } from '@/components/heading'
import { Icon } from '@/components/icon'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import {
  Badge,
  cellClass,
  formatTime,
  inputClass,
  mainButtonClass,
  tableClass,
} from '@/components/mailing/parts'
import { MailingSessionExpired, mailingCall } from '@/hooks/use-mailing'
import type { SubscriberHistoryRow, SubscriberRow } from '@/utils/mailing-types'
import { SOURCE_LABELS, StatusBadge } from './subscriber-table'

interface SubscriberDetailProps {
  subscriber: SubscriberRow | null
  onClose: () => void
  onChanged: () => void
  onExpired: () => void
}

type Step = { label: string; tone: 'plain' | 'good' | 'strong' | 'warn' }

function times(label: string, count: number) {
  return count > 1 ? `${label} ×${count.toLocaleString()}` : label
}

// Everything that became of one email, in the order it happened. One that
// was never sent has a single step saying why.
function steps(row: SubscriberHistoryRow): Step[] {
  if (row.status === 'skipped') return [{ label: 'Skipped', tone: 'plain' }]
  if (row.status === 'failed') return [{ label: 'Not sent', tone: 'warn' }]
  if (row.status === 'queued') return [{ label: 'Waiting', tone: 'plain' }]

  const list: Step[] = [{ label: 'Sent', tone: 'plain' }]
  if (row.delivered) list.push({ label: 'Delivered', tone: 'plain' })
  if (row.bounced) list.push({ label: 'Bounced', tone: 'warn' })
  if (row.opens) list.push({ label: times('Opened', row.opens), tone: 'good' })
  if (row.clicks) list.push({ label: times('Clicked', row.clicks), tone: 'strong' })
  if (row.unsubscribed) list.push({ label: 'Unsubscribed', tone: 'warn' })
  if (row.complained) list.push({ label: 'Reported spam', tone: 'warn' })
  return list
}

// One subscriber: their details, their name to correct, and every campaign
// they were sent with what they did with it.
export function SubscriberDetail({ subscriber, onClose, onChanged, onExpired }: SubscriberDetailProps) {
  const [history, setHistory] = useState<SubscriberHistoryRow[] | null>(null)
  const [names, setNames] = useState({ firstName: '', lastName: '' })
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState('')
  const id = subscriber?.id

  useEffect(() => {
    if (!subscriber) return
    setNames({ firstName: subscriber.firstName, lastName: subscriber.lastName })
  }, [subscriber])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setHistory(null)
    setProblem('')
    mailingCall<{ history: SubscriberHistoryRow[] }>(`/api/mailing/subscribers/?id=${id}`)
      .then((result) => {
        if (!cancelled) setHistory(result.history)
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof MailingSessionExpired) onExpired()
        else setProblem((error as Error).message)
      })
    return () => {
      cancelled = true
    }
  }, [id, onExpired])

  const rename = async () => {
    if (!id) return
    setSaving(true)
    setProblem('')
    try {
      await mailingCall('/api/mailing/subscribers/', { body: { action: 'rename', id, ...names } })
      onChanged()
    } catch (error) {
      if (error instanceof MailingSessionExpired) onExpired()
      else setProblem((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const renamed =
    subscriber !== null &&
    (names.firstName !== subscriber.firstName || names.lastName !== subscriber.lastName)

  return (
    <Dialog open={subscriber !== null} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-overlay/30" aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 flex w-full max-w-lg">
        <DialogPanel className="relative flex w-full flex-col gap-4 overflow-auto bg-body p-5 shadow-lg sm:p-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 p-1 text-contrast/60 hover:text-contrast cursor-pointer"
          >
            <Icon icon={xMarkIcon} className="w-5 h-5" />
          </button>
          {subscriber && (
            <>
              <DialogTitle as="div" className="pr-8">
                <Heading as="h3" margin="mb-1" disableId className="break-all">
                  {subscriber.email}
                </Heading>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={subscriber.status} />
                  <Span fontSize="text-xs" color="text-contrast-light">
                    {SOURCE_LABELS[subscriber.source]} · added {formatTime(subscriber.createdAt)}
                    {subscriber.confirmedAt ? ` · confirmed ${formatTime(subscriber.confirmedAt)}` : ''}
                    {subscriber.unsubscribedAt ? ` · unsubscribed ${formatTime(subscriber.unsubscribedAt)}` : ''}
                  </Span>
                </div>
              </DialogTitle>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-1">
                  <Span fontSize="text-xs" fontWeight="font-semibold">First name</Span>
                  <input
                    type="text"
                    value={names.firstName}
                    onChange={(event) => setNames({ ...names, firstName: event.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1">
                  <Span fontSize="text-xs" fontWeight="font-semibold">Last name</Span>
                  <input
                    type="text"
                    value={names.lastName}
                    onChange={(event) => setNames({ ...names, lastName: event.target.value })}
                    className={inputClass}
                  />
                </label>
                <button
                  type="button"
                  className={mainButtonClass}
                  disabled={!renamed || saving}
                  onClick={rename}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>

              {problem && (
                <Paragraph margin="mb-0" fontSize="text-xs" color="text-accent">
                  {problem}
                </Paragraph>
              )}

              <div className="flex flex-col gap-2">
                <Span fontSize="text-sm" fontWeight="font-semibold">Campaigns sent</Span>
                {history === null ? (
                  <Span fontSize="text-xs" color="text-contrast-light">Reading…</Span>
                ) : history.length === 0 ? (
                  <Span fontSize="text-xs" color="text-contrast-light">None yet.</Span>
                ) : (
                  <div className="overflow-auto rounded-md border border-contrast/15">
                    <table className={tableClass}>
                      <thead className="bg-accent/5">
                        <tr>
                          <th scope="col" className={cellClass}>Campaign</th>
                          <th scope="col" className={cellClass}>Sent</th>
                          <th scope="col" className={cellClass}>What happened</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-contrast/10">
                        {history.map((row) => {
                          return (
                            <tr key={row.campaignId}>
                              <td className={cellClass}>{row.subject}</td>
                              <td className={`${cellClass} whitespace-nowrap`}>{formatTime(row.sentAt)}</td>
                              <td className={cellClass}>
                                <div className="flex flex-wrap gap-1">
                                  {steps(row).map((step) => (
                                    <Badge key={step.label} tone={step.tone}>
                                      {step.label}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
