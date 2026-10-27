'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Dialog, DialogPanel, DialogTitle, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import xMarkIcon from '@iconify/icons-heroicons/x-mark'
import { Heading } from '@/components/heading'
import { Icon } from '@/components/icon'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import {
  actionRowClass,
  Checkbox,
  inputClass,
  mainButtonClass,
  plural,
  ProgressBar,
  quietButtonClass,
} from '@/components/mailing/parts'
import { MailingSessionExpired, mailingCall } from '@/hooks/use-mailing'
import type { BulkCheck, NewSubscriber } from '@/utils/mailing-types'
import { STATUS_LABELS } from './subscriber-table'
import { parseList } from './parse-list'

type Mode = 'subscribed' | 'confirm'

// How many go in one request: a confirmation is an email sent while the
// request waits.
const CHUNK: Record<Mode, number> = { subscribed: 1000, confirm: 25 }
const CHECK_CHUNK = 5000
// How many of each kind the preview lists by name.
const SHOWN = 12

interface AddSubscribersProps {
  open: boolean
  onClose: () => void
  onAdded: () => void
  onExpired: () => void
}

function ModeChoice({
  mode,
  onMode,
  consent,
  onConsent,
}: {
  mode: Mode
  onMode: (mode: Mode) => void
  consent: boolean
  onConsent: (consent: boolean) => void
}) {
  const radio =
    'h-4 w-4 shrink-0 appearance-none rounded-full border border-accent checked:bg-accent checked:border-accent focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer'
  return (
    <fieldset className="flex flex-col gap-2 rounded-md bg-accent/5 p-3">
      <legend className="sr-only">How to add them</legend>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="radio"
          name="add-mode"
          checked={mode === 'confirm'}
          onChange={() => onMode('confirm')}
          className={clsx(radio, 'mt-0.5')}
        />
        <Span fontSize="text-xs">
          <strong>Send them a confirmation email.</strong> They go on the list when they press its
          button. Use this when you are not sure they asked.
        </Span>
      </label>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="radio"
          name="add-mode"
          checked={mode === 'subscribed'}
          onChange={() => onMode('subscribed')}
          className={clsx(radio, 'mt-0.5')}
        />
        <Span fontSize="text-xs">
          <strong>Add them as subscribed.</strong> No email is sent now; they get the next
          campaign.
        </Span>
      </label>
      {mode === 'subscribed' && (
        <label className="ml-6 flex items-start gap-2 cursor-pointer">
          <Checkbox
            label="They asked to receive these emails"
            checked={consent}
            onChange={(checked) => onConsent(checked)}
          />
          <Span fontSize="text-xs">
            They asked to receive these emails. Sending to people who did not is against the law on
            marketing email, and gets the site’s mail marked as spam.
          </Span>
        </label>
      )}
    </fieldset>
  )
}

// Adding to the mailing list by hand: one person, or a list pasted or read
// from a CSV file, checked before anything is saved.
export function AddSubscribers({ open, onClose, onAdded, onExpired }: AddSubscribersProps) {
  const [tab, setTab] = useState(0)
  const [mode, setMode] = useState<Mode>('confirm')
  const [consent, setConsent] = useState(false)
  const [one, setOne] = useState({ email: '', firstName: '', lastName: '' })
  const [text, setText] = useState('')
  const [check, setCheck] = useState<BulkCheck | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')

  const fail = (error: unknown) => {
    if (error instanceof MailingSessionExpired) onExpired()
    else setProblem((error as Error).message || 'Something went wrong.')
  }

  const reset = () => {
    setOne({ email: '', firstName: '', lastName: '' })
    setText('')
    setCheck(null)
    setProgress(null)
    setConsent(false)
    setProblem('')
  }

  const close = () => {
    if (busy) return
    reset()
    setNotice('')
    onClose()
  }

  const ready = mode === 'confirm' || consent

  // Checks a list in pieces the server accepts, and puts the answers together.
  const checkList = async (list: NewSubscriber[]): Promise<BulkCheck> => {
    const merged: BulkCheck = { add: [], subscribed: [], pending: [], leftAlone: [], invalid: [], duplicates: 0 }
    const seen = new Set<string>()
    for (let i = 0; i < list.length; i += CHECK_CHUNK) {
      const { check: part } = await mailingCall<{ check: BulkCheck }>('/api/mailing/subscribers/', {
        body: { action: 'check', list: list.slice(i, i + CHECK_CHUNK) },
      })
      for (const item of part.add) {
        if (seen.has(item.email)) merged.duplicates++
        else {
          seen.add(item.email)
          merged.add.push(item)
        }
      }
      merged.subscribed.push(...part.subscribed)
      merged.pending.push(...part.pending)
      merged.leftAlone.push(...part.leftAlone)
      merged.invalid.push(...part.invalid)
      merged.duplicates += part.duplicates
    }
    return merged
  }

  // Adds the new addresses a few hundred, or for confirmations a few dozen,
  // at a time.
  const save = async (list: NewSubscriber[]) => {
    setBusy(true)
    setProblem('')
    setProgress(0)
    let added = 0
    let confirmations = 0
    try {
      for (let i = 0; i < list.length; i += CHUNK[mode]) {
        const result = await mailingCall<{ added: number; confirmations: number }>(
          '/api/mailing/subscribers/',
          { body: { action: 'add', mode, consent, list: list.slice(i, i + CHUNK[mode]) } }
        )
        added += result.added
        confirmations += result.confirmations
        setProgress(Math.min(1, (i + CHUNK[mode]) / list.length))
      }
      setNotice(
        mode === 'confirm'
          ? `${plural(confirmations, 'confirmation email')} sent. They join the list when they confirm.`
          : `${plural(added, 'subscriber')} added.`
      )
      reset()
      onAdded()
    } catch (error) {
      fail(error)
      if (added) onAdded()
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const addOne = async () => {
    setNotice('')
    setBusy(true)
    try {
      const result = await checkList([one])
      if (!result.add.length) {
        setProblem(
          result.invalid.length
            ? 'That is not an email address.'
            : result.subscribed.length
              ? 'That address is already subscribed.'
              : result.pending.length
                ? 'That address is already waiting to confirm. Resend the confirmation from the list.'
                : `That address is on the list as “${STATUS_LABELS[result.leftAlone[0]!.status]}”. Change it from the list if they asked to be subscribed again.`
        )
        setBusy(false)
        return
      }
      await save(result.add)
    } catch (error) {
      fail(error)
      setBusy(false)
    }
  }

  const readFile = async (file: File | undefined) => {
    if (!file) return
    setText(await file.text())
    setCheck(null)
  }

  const runCheck = async () => {
    setNotice('')
    setProblem('')
    const list = parseList(text)
    if (!list.length) {
      setProblem('Paste some addresses first.')
      return
    }
    setBusy(true)
    try {
      setCheck(await checkList(list))
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  const summary = (label: string, items: string[]) =>
    items.length > 0 && (
      <div className="flex flex-col gap-1">
        <Span fontSize="text-xs" fontWeight="font-semibold">
          {label}: {items.length.toLocaleString()}
        </Span>
        <Span fontSize="text-xs" color="text-contrast-light" className="break-all">
          {items.slice(0, SHOWN).join(', ')}
          {items.length > SHOWN ? `, and ${(items.length - SHOWN).toLocaleString()} more` : ''}
        </Span>
      </div>
    )

  return (
    <Dialog open={open} onClose={close} className="relative z-50">
      <div className="fixed inset-0 bg-overlay/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <DialogPanel className="relative flex max-h-full w-full max-w-2xl flex-col overflow-auto rounded-lg bg-body p-5 shadow-lg sm:p-6">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            aria-label="Close"
            className="absolute right-3 top-3 p-1 text-contrast/60 hover:text-contrast cursor-pointer disabled:opacity-40"
          >
            <Icon icon={xMarkIcon} className="w-5 h-5" />
          </button>
          <DialogTitle as="div">
            <Heading as="h3" margin="mb-3" disableId>
              Add subscribers
            </Heading>
          </DialogTitle>

          <TabGroup selectedIndex={tab} onChange={(index) => { setTab(index); setProblem('') }}>
            <TabList className="mb-4 flex gap-1 border-b border-contrast/15">
              {['One person', 'A list or CSV file'].map((name) => (
                <Tab
                  key={name}
                  className="-mb-px cursor-pointer border-b-2 border-transparent px-3 py-2 text-xs font-medium text-contrast-light outline-none hover:text-contrast data-[selected]:border-accent data-[selected]:text-accent"
                >
                  {name}
                </Tab>
              ))}
            </TabList>
            <TabPanels>
              <TabPanel className="flex flex-col gap-3 outline-none">
                <label className="flex flex-col gap-1">
                  <Span fontSize="text-xs" fontWeight="font-semibold">Email</Span>
                  <input
                    type="email"
                    value={one.email}
                    onChange={(event) => setOne({ ...one, email: event.target.value })}
                    className={inputClass}
                    autoComplete="off"
                  />
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="flex flex-1 flex-col gap-1">
                    <Span fontSize="text-xs" fontWeight="font-semibold">First name</Span>
                    <input
                      type="text"
                      value={one.firstName}
                      onChange={(event) => setOne({ ...one, firstName: event.target.value })}
                      className={inputClass}
                      autoComplete="off"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1">
                    <Span fontSize="text-xs" fontWeight="font-semibold">Last name</Span>
                    <input
                      type="text"
                      value={one.lastName}
                      onChange={(event) => setOne({ ...one, lastName: event.target.value })}
                      className={inputClass}
                      autoComplete="off"
                    />
                  </label>
                </div>
                <ModeChoice mode={mode} onMode={setMode} consent={consent} onConsent={setConsent} />
                <div className={actionRowClass}>
                  <button
                    type="button"
                    className={mainButtonClass}
                    disabled={busy || !ready || !one.email.trim()}
                    onClick={addOne}
                  >
                    {busy ? 'Adding…' : mode === 'confirm' ? 'Send confirmation' : 'Add subscriber'}
                  </button>
                </div>
              </TabPanel>

              <TabPanel className="flex flex-col gap-3 outline-none">
                <Paragraph margin="mb-0" fontSize="text-xs" color="text-contrast-light">
                  One address per line, or “Name &lt;email&gt;”, or rows with email, first name and
                  last name separated by commas or tabs, as copied from a spreadsheet.
                </Paragraph>
                <textarea
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value)
                    setCheck(null)
                  }}
                  rows={8}
                  placeholder={'ann@example.com\nBob Jones <bob@example.com>\ncy@example.com, Cy, Young'}
                  aria-label="Addresses"
                  className={clsx(inputClass, 'font-mono')}
                />
                <div className={actionRowClass}>
                  <label className={clsx(quietButtonClass, 'cursor-pointer')}>
                    Choose a CSV file
                    <input
                      type="file"
                      accept=".csv,.txt,text/csv,text/plain"
                      className="sr-only"
                      onChange={(event) => readFile(event.target.files?.[0])}
                    />
                  </label>
                  <button
                    type="button"
                    className={mainButtonClass}
                    disabled={busy || !text.trim()}
                    onClick={runCheck}
                  >
                    {busy && !check ? 'Checking…' : 'Check the list'}
                  </button>
                </div>

                {check && (
                  <div className="flex flex-col gap-3 rounded-md border border-contrast/15 p-3">
                    <Span fontSize="text-sm" fontWeight="font-semibold">
                      {check.add.length
                        ? `${plural(check.add.length, 'new address')} to add`
                        : 'Nothing new to add'}
                    </Span>
                    {summary('Already subscribed', check.subscribed)}
                    {summary('Already waiting to confirm', check.pending)}
                    {summary(
                      'Left alone: unsubscribed, bounced or reported spam',
                      check.leftAlone.map((item) => `${item.email} (${STATUS_LABELS[item.status]})`)
                    )}
                    {summary('Not email addresses', check.invalid)}
                    {check.duplicates > 0 && (
                      <Span fontSize="text-xs" color="text-contrast-light">
                        {plural(check.duplicates, 'duplicate')} in the list, counted once.
                      </Span>
                    )}
                    {check.add.length > 0 && (
                      <>
                        <ModeChoice mode={mode} onMode={setMode} consent={consent} onConsent={setConsent} />
                        <div className={actionRowClass}>
                          <button
                            type="button"
                            className={mainButtonClass}
                            disabled={busy || !ready}
                            onClick={() => save(check.add)}
                          >
                            {busy
                              ? 'Adding…'
                              : mode === 'confirm'
                                ? `Send ${plural(check.add.length, 'confirmation email')}`
                                : `Add ${plural(check.add.length, 'subscriber')}`}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </TabPanel>
            </TabPanels>
          </TabGroup>

          {progress !== null && (
            <div className="mt-3">
              <ProgressBar fraction={progress} />
            </div>
          )}
          <div className="mt-3" role="status" aria-live="polite">
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
        </DialogPanel>
      </div>
    </Dialog>
  )
}
