'use client'

import { useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import {
  cellClass,
  inputClass,
  mainButtonClass,
  quietButtonClass,
  tableClass,
} from '@/components/mailing/parts'
import { useDemo } from '@/hooks/use-demo'
import { MailingSessionExpired, mailingCall } from '@/hooks/use-mailing'
import { useFlowTraceRead } from '@/hooks/use-flow-trace'
import { flowTraceConfig } from '@/utils/flow-trace-config'
import type { FtEmailMode, FtSettings } from '@/utils/flow-trace-types'

const hour = `${flowTraceConfig.digestHour % 12 || 12}${flowTraceConfig.digestHour < 12 ? 'am' : 'pm'}`

const MODES: { mode: FtEmailMode; label: string; detail: string }[] = [
  {
    mode: 'instant',
    label: 'Every visit that converts',
    detail:
      'A report the moment a reader sends the contact form, joins the newsletter, creates an account or clicks an email link, with everything they read up to then.',
  },
  {
    mode: 'daily',
    label: 'Daily summary',
    detail: `Yesterday's converted visits, each morning at ${hour}.`,
  },
  {
    mode: 'weekly',
    label: 'Weekly summary',
    detail: `The last seven days, Monday mornings at ${hour}.`,
  },
  {
    mode: 'off',
    label: 'No emails',
    detail: 'Reports stay here in FlowTrace.',
  },
]

const MODE_NAMES = Object.fromEntries(
  MODES.map(({ mode, label }) => [mode, label])
) as Record<FtEmailMode, string>

const RESULTS: Record<string, string> = {
  sent: 'A test report is on its way to you.',
  none: 'There are no converted visits to report on yet.',
  failed: 'The test report could not be sent. Try again in a minute.',
}

interface SettingsTabProps {
  onExpired: () => void
  refreshed: number
}

// Which FlowTrace emails the administrator gets, a test report, and who else
// gets what. Only an address on FLOWTRACE_EMAILS (or EMAIL_TO) is emailed.
export function SettingsTab({ onExpired, refreshed }: SettingsTabProps) {
  const [asked, setAsked] = useState(0)
  const read = useFlowTraceRead<FtSettings>(
    `/api/flowtrace/settings/?n=${asked}`,
    onExpired,
    refreshed
  )
  const settings = read.value
  const { demo } = useDemo()
  // The demo asks where to send its one test report, in a box of its own.
  const [askingAddress, setAskingAddress] = useState(false)
  const [address, setAddress] = useState('')
  const [chosen, setChosen] = useState<FtEmailMode | null>(null)
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [notice, setNotice] = useState('')
  const mode = chosen ?? settings?.mode

  const act = async (kind: 'save' | 'test') => {
    setBusy(kind)
    setNotice('')
    try {
      if (kind === 'save') {
        await mailingCall('/api/flowtrace/settings/', { body: { mode } })
        setNotice('Saved.')
        setChosen(null)
        setAsked((n) => n + 1)
      } else {
        const answer = await mailingCall<{ result: string; sentTo?: string }>(
          '/api/flowtrace/test-report/',
          { body: demo ? { email: address.trim() } : {} }
        )
        setNotice(
          demo && answer.sentTo
            ? `A test report on a made-up visit is on its way to ${answer.sentTo}.`
            : (RESULTS[answer.result] ?? RESULTS.failed!)
        )
        setAskingAddress(false)
      }
    } catch (error) {
      if (error instanceof MailingSessionExpired) return onExpired()
      setNotice((error as Error).message || 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  if (!settings) {
    return (
      <Paragraph
        margin="mb-0"
        fontSize="text-xs"
        color={read.problem ? 'text-accent' : 'text-contrast-light'}
      >
        {read.problem || 'Reading…'}
      </Paragraph>
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        {settings.recipient ? (
          <Paragraph
            fontSize="text-xs"
            color="text-contrast-light"
            margin="mb-0"
          >
            What gets sent to {settings.email}. Every report holds the whole
            visit, and links to it here.
          </Paragraph>
        ) : (
          <Paragraph
            fontSize="text-xs"
            margin="mb-0"
            className="rounded-md bg-accent/10 px-3 py-2"
          >
            {settings.email ?? 'Your address'} is not sent FlowTrace emails, so
            these choices are not yours to make. Reports go to the addresses
            in the <code>FLOWTRACE_EMAILS</code>{' '}setting, or to the contact
            form&rsquo;s inbox (<code>EMAIL_TO</code>) when it is empty. Add
            your address there to get them and choose how.
          </Paragraph>
        )}
        {notice && (
          <Paragraph
            role="status"
            fontSize="text-xs"
            color="text-accent"
            margin="mb-0"
          >
            {notice}
          </Paragraph>
        )}
        <div
          role="radiogroup"
          aria-label="FlowTrace emails"
          className="flex flex-col gap-2"
        >
          {MODES.map((option) => (
            <label
              key={option.mode}
              className="flex cursor-pointer gap-3 rounded-md border border-contrast/15 p-3 has-[:checked]:border-accent has-[:checked]:ring-1 has-[:checked]:ring-inset has-[:checked]:ring-accent has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
            >
              {/* As tall as the title's line, so the circle sits centred on it. */}
              <span className="flex h-5 shrink-0 items-center">
                <input
                  type="radio"
                  name="flowtrace-mode"
                  value={option.mode}
                  checked={mode === option.mode}
                  disabled={!settings.recipient}
                  onChange={() => setChosen(option.mode)}
                  className="m-0 h-4 w-4 accent-accent"
                />
              </span>
              <div className="flex flex-col gap-0.5">
                <Span
                  fontSize="text-sm"
                  fontWeight="font-semibold"
                  lineHeight="leading-5"
                >
                  {option.label}
                </Span>
                <Span
                  fontSize="text-xs"
                  color="text-contrast-light"
                >
                  {option.detail}
                </Span>
              </div>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={mainButtonClass}
            disabled={
              !settings.recipient ||
              busy !== null ||
              chosen === null ||
              chosen === settings.mode
            }
            onClick={() => act('save')}
          >
            {busy === 'save' ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className={quietButtonClass}
            disabled={busy !== null || (!demo && !settings.email)}
            onClick={() => (demo ? setAskingAddress(true) : act('test'))}
          >
            {busy === 'test' ? 'Sending…' : 'Send me a test report'}
          </button>
        </div>
      </section>

      <Dialog
        open={askingAddress}
        onClose={() => busy === null && setAskingAddress(false)}
        className="relative z-60"
      >
        <div
          className="fixed inset-0 bg-overlay/30"
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded-md bg-body p-6 shadow-lg">
            <DialogTitle as="div">
              <Heading
                as="h4"
                color="text-contrast"
                fontSize="text-base"
                margin="mb-2"
                disableId
              >
                Send a test report
              </Heading>
            </DialogTitle>
            <Paragraph
              fontSize="text-xs"
              color="text-contrast-light"
              margin="mb-4"
            >
              A FlowTrace report on a made-up visit, as the team would get it.
              Each address can have one.
            </Paragraph>
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                act('test')
              }}
            >
              <input
                type="email"
                required
                autoFocus
                value={address}
                placeholder="you@example.com"
                aria-label="Your email address"
                onChange={(event) => setAddress(event.target.value)}
                className={inputClass}
              />
              {notice && (
                <Paragraph
                  role="status"
                  fontSize="text-xs"
                  color="text-accent"
                  margin="mb-0"
                >
                  {notice}
                </Paragraph>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={quietButtonClass}
                  disabled={busy !== null}
                  onClick={() => setAskingAddress(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={mainButtonClass}
                  disabled={busy !== null || !address.trim()}
                >
                  {busy === 'test' ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <section className="flex flex-col gap-3">
        <Heading
          as="h4"
          color="text-contrast"
          fontSize="text-base"
          margin="mb-0"
          disableId
        >
          Who gets FlowTrace emails
        </Heading>
        {settings.team.length ? (
          <table className={tableClass}>
            <tbody className="divide-y divide-contrast/10">
              {settings.team.map((person) => (
                <tr key={person.email}>
                  <td className={cellClass}>{person.email}</td>
                  <td className={cellClass}>{MODE_NAMES[person.mode]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Paragraph
            fontSize="text-xs"
            color="text-contrast-light"
            margin="mb-0"
          >
            Nobody: set <code>FLOWTRACE_EMAILS</code> or <code>EMAIL_TO</code>.
          </Paragraph>
        )}
      </section>
    </div>
  )
}
