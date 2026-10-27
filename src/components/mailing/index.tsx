'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import xMarkIcon from '@iconify/icons-heroicons/x-mark'
import { Heading } from '@/components/heading'
import { Icon } from '@/components/icon'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import {
  MailingSessionExpired,
  mailingCall,
  useCampaignSend,
} from '@/hooks/use-mailing'
import { demoEmailSentToday, markDemoEmailSent, useDemo } from '@/hooks/use-demo'
import { useMember } from '@/hooks/use-member'
import type { Campaign } from '@/utils/mailing-types'
import {
  ProgressBar,
  actionRowClass,
  bodyClass,
  closeClass,
  inputClass,
  mainButtonClass,
  panelClass,
  plural,
  quietButtonClass,
  tabClass,
  tabListClass,
} from './parts'
import { SubscribersManager } from '@/components/subscribers'
import { AudienceTab, type AudienceChoice } from './audience-tab'
import { ReportsTab } from './reports-tab'

const TABS = ['Email', 'Audience', 'Send', 'Reports', 'Subscribers'] as const
const SEND_TAB = 2
const REPORTS_TAB = 3
const SUBSCRIBERS_TAB = 4

type Preview = { subject: string; preheader: string; html: string }

// The email as the preview shows it: every link opens in a new tab, so where
// it goes can be checked before sending, and never inside the frame, which
// has no way back. Only the preview: the email that is sent keeps its links
// as they are.
function previewDocument(html: string): string {
  return html.replace(/<head>/i, '<head><base target="_blank" />')
}

type Created = { campaign: Campaign; queued: number }

// Across the top of the screens while the toolbar's demo is on.
function DemoBanner({ onPost = false }: { onPost?: boolean }) {
  return (
    <Paragraph
      margin="mb-3"
      fontSize="text-xs"
      className="rounded-md bg-accent/10 px-3 py-2"
    >
      <strong>Demo.</strong> Every subscriber, campaign and number here is made up, and
      nothing you do changes the real list.{' '}
      {onPost
        ? 'Sending to the list only moves the numbers. The one real thing: you can email yourself this post once, to see it as subscribers do.'
        : 'Open a post and press Email to try sending one.'}
    </Paragraph>
  )
}

interface MailingDialogProps {
  open: boolean
  onClose: () => void
  // The post on the page, when there is one.
  postId?: number
  // The post's path on the site, such as /2024/05/a-post/.
  path?: string
}

type PostMailingProps = Required<MailingDialogProps>

// On a post: the post as an email, who it goes to, sending, its reports, and
// the subscribers. Anywhere else: the subscribers alone.
export function MailingDialog({ open, onClose, postId, path }: MailingDialogProps) {
  if (postId && path) {
    return <PostMailingDialog open={open} onClose={onClose} postId={postId} path={path} />
  }
  return <SubscribersDialog open={open} onClose={onClose} />
}

function SubscribersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logOut } = useMember()
  const { demo } = useDemo()

  const expire = useCallback(() => {
    onClose()
    logOut()
  }, [onClose, logOut])

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-overlay/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <DialogPanel className={panelClass}>
          <button type="button" onClick={onClose} aria-label="Close" className={closeClass}>
            <Icon icon={xMarkIcon} className="w-5 h-5" />
          </button>
          <DialogTitle as="div">
            <Heading as="h3" margin="mb-4" disableId>
              Subscribers
            </Heading>
          </DialogTitle>
          {demo && <DemoBanner />}
          <div className={bodyClass}>
            <SubscribersManager onExpired={expire} />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

// Sends the post on this page as an email to the mailing list, and reports
// how it did. Only an administrator ever sees it, and every route it calls
// checks with WordPress that they still are one.
function PostMailingDialog({ open, onClose, postId, path }: PostMailingProps) {
  const { logOut } = useMember()
  const { demo } = useDemo()
  const send = useCampaignSend()
  // The demo has no logged-in address to send the test to: it asks for one.
  const [testAddress, setTestAddress] = useState('')
  const [testUsed, setTestUsed] = useState(false)
  useEffect(() => {
    if (demo) setTestUsed(demoEmailSentToday())
  }, [demo])

  const [tab, setTab] = useState(0)
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  // Goes up with each preview loaded, so the frame is built again even when
  // the email comes back the same: it may have been left on another page.
  const [previewRun, setPreviewRun] = useState(0)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [audience, setAudience] = useState<AudienceChoice>('all')
  const [ticked, setTicked] = useState<Set<number>>(new Set())
  const [subscribedCount, setSubscribedCount] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<Created | null>(null)

  const sending = send.phase === 'sending'
  const busy = sending || creating

  // Kept in a ref so the effects below do not run again each time the page
  // around the dialog renders.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  const expire = useCallback(() => {
    closeRef.current()
    logOut()
  }, [logOut])

  const fail = useCallback(
    (error: unknown) => {
      if (error instanceof MailingSessionExpired) expire()
      else setProblem((error as Error).message || 'Something went wrong.')
    },
    [expire]
  )

  const loadPreview = useCallback(
    async (overrides: { subject?: string; preheader?: string } = {}) => {
      setPreviewBusy(true)
      setProblem('')
      try {
        const result = await mailingCall<Preview>('/api/mailing/preview/', {
          body: { path, ...overrides },
        })
        setPreview(result)
        setPreviewRun((run) => run + 1)
        setSubject(result.subject)
        setPreheader(result.preheader)
      } catch (error) {
        fail(error)
      } finally {
        setPreviewBusy(false)
      }
    },
    [path, fail]
  )

  const loadCount = useCallback(async () => {
    try {
      const result = await mailingCall<{ counts: { subscribed: number } }>(
        '/api/mailing/subscribers/?status=subscribed&page=1'
      )
      setSubscribedCount(result.counts.subscribed)
    } catch (error) {
      fail(error)
    }
  }, [fail])

  useEffect(() => {
    if (!open) return
    loadPreview()
    loadCount()
  }, [open, loadPreview, loadCount])

  useEffect(() => {
    if (send.phase === 'expired') logOut()
  }, [send.phase, logOut])

  const sendTest = async () => {
    setNotice('')
    setProblem('')
    setPreviewBusy(true)
    try {
      const result = await mailingCall<{ sentTo: string }>('/api/mailing/test/', {
        body: { path, subject, preheader, ...(demo ? { email: testAddress } : {}) },
      })
      setNotice(`Test sent to ${result.sentTo}.`)
      if (demo) {
        markDemoEmailSent()
        setTestUsed(true)
      }
    } catch (error) {
      if (demo && (error as { used?: boolean }).used) {
        markDemoEmailSent()
        setTestUsed(true)
      }
      fail(error)
    } finally {
      setPreviewBusy(false)
    }
  }

  const createAndSend = async () => {
    setConfirming(false)
    setCreating(true)
    setProblem('')
    try {
      const result = await mailingCall<Created>('/api/mailing/campaigns/', {
        body: { path, subject, preheader, audience: audience === 'all' ? 'all' : [...ticked] },
      })
      setCreated(result)
      if (result.queued > 0) send.start(result.campaign.id)
    } catch (error) {
      fail(error)
    } finally {
      setCreating(false)
    }
  }

  const resume = (campaign: Campaign) => {
    setCreated(null)
    setTab(SEND_TAB)
    send.start(campaign.id)
  }

  const startOver = () => {
    send.reset()
    setCreated(null)
  }

  const close = () => {
    // Sending keeps going until it is paused or done, so clicking away
    // does not close it.
    if (!busy) onClose()
  }

  const chosen = audience === 'all' ? (subscribedCount ?? 0) : ticked.size
  const campaign = send.campaign ?? created?.campaign ?? null
  const totals = campaign?.totals
  const handled = totals ? totals.sent + totals.failed + totals.skipped + totals.unconfirmed : 0
  const inProgress = send.phase !== 'idle' || created !== null

  return (
    <Dialog open={open} onClose={close} className="relative z-50">
      <div className="fixed inset-0 bg-overlay/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <DialogPanel className={panelClass}>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            aria-label="Close"
            className={closeClass}
          >
            <Icon icon={xMarkIcon} className="w-5 h-5" />
          </button>
          <DialogTitle as="div">
            <Heading as="h3" margin="mb-3" disableId>
              Marketing email
            </Heading>
          </DialogTitle>
          {demo && <DemoBanner onPost />}

          <TabGroup selectedIndex={tab} onChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <TabList className={tabListClass}>
              {TABS.map((name, index) => (
                <Tab key={name} className={tabClass}>
                  {name}
                  {index === 1 && chosen > 0 ? ` (${chosen.toLocaleString()})` : ''}
                </Tab>
              ))}
            </TabList>

            <TabPanels className={bodyClass}>
              <TabPanel className="flex flex-col gap-3 outline-none sm:h-full">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="flex flex-1 flex-col gap-1">
                    <Span fontSize="text-xs" fontWeight="font-semibold">Subject</Span>
                    <input
                      type="text"
                      value={subject}
                      maxLength={200}
                      onChange={(event) => setSubject(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1">
                    <Span fontSize="text-xs" fontWeight="font-semibold">
                      Preview line, shown after the subject in an inbox
                    </Span>
                    <input
                      type="text"
                      value={preheader}
                      maxLength={200}
                      onChange={(event) => setPreheader(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>
                <div className={actionRowClass}>
                  <button
                    type="button"
                    className={quietButtonClass}
                    disabled={previewBusy}
                    onClick={() => loadPreview({ subject, preheader })}
                  >
                    Update preview
                  </button>
                  {demo && (
                    <input
                      type="email"
                      value={testAddress}
                      placeholder="Your email, for one test"
                      aria-label="Your email address, for the one test email"
                      disabled={testUsed}
                      onChange={(event) => setTestAddress(event.target.value)}
                      className={`${inputClass} sm:w-56`}
                    />
                  )}
                  <button
                    type="button"
                    className={quietButtonClass}
                    disabled={previewBusy || (demo && (testUsed || !testAddress.trim()))}
                    onClick={sendTest}
                  >
                    {demo && testUsed ? 'Test email used' : 'Send a test to me'}
                  </button>
                  <button type="button" className={mainButtonClass} onClick={() => setTab(1)}>
                    Next: choose recipients
                  </button>
                  <Span fontSize="text-xs" color="text-contrast-light" role="status" aria-live="polite">
                    {previewBusy ? 'Working…' : notice}
                  </Span>
                </div>
                {problem && (
                  <Paragraph margin="mb-0" fontSize="text-xs" color="text-accent">
                    {problem}
                  </Paragraph>
                )}
                <div className="h-[70vh] shrink-0 overflow-hidden rounded-md border border-contrast/15 bg-accent/5 sm:h-auto sm:min-h-0 sm:flex-1 sm:shrink">
                  {preview ? (
                    <iframe
                      key={previewRun}
                      title="Email preview"
                      srcDoc={previewDocument(preview.html)}
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                      className="h-full w-full"
                    />
                  ) : (
                    <Paragraph margin="m-4" fontSize="text-xs" color="text-contrast-light">
                      {previewBusy ? 'Preparing the email…' : 'No preview yet.'}
                    </Paragraph>
                  )}
                </div>
              </TabPanel>

              <TabPanel className="outline-none sm:h-full">
                <AudienceTab
                  choice={audience}
                  onChoice={setAudience}
                  subscribed={subscribedCount}
                  ticked={ticked}
                  onTicked={setTicked}
                  onManage={() => setTab(SUBSCRIBERS_TAB)}
                  onExpired={expire}
                />
              </TabPanel>

              <TabPanel className="flex flex-col gap-4 outline-none sm:h-full sm:overflow-auto">
                {!inProgress && (
                  <>
                    <div className="flex flex-col gap-1 rounded-md bg-accent/5 p-4">
                      <Span fontSize="text-xs" color="text-contrast-light">Subject</Span>
                      <Span fontSize="text-sm" fontWeight="font-semibold">{subject || '—'}</Span>
                      <Span fontSize="text-xs" color="text-contrast-light" margin="mt-2">Going to</Span>
                      <Span fontSize="text-sm" fontWeight="font-semibold">{plural(chosen, 'person')}</Span>
                    </div>
                    <Paragraph margin="mb-0" fontSize="text-xs" color="text-contrast-light">
                      Only people subscribed when it reaches them are sent it. The email is sent to one person at a time, each with their own unsubscribe
                      link. Keep this page open until it finishes. If it is closed, or Cloudflare’s
                      daily limit is reached, the campaign pauses and can be resumed under Reports
                      without anyone being sent it twice.
                    </Paragraph>
                    {confirming ? (
                      <div className={actionRowClass}>
                        <Span fontSize="text-sm" fontWeight="font-semibold">
                          Send “{subject}” to {plural(chosen, 'person')} now?
                        </Span>
                        <button type="button" className={quietButtonClass} onClick={() => setConfirming(false)}>
                          Cancel
                        </button>
                        <button type="button" className={mainButtonClass} onClick={createAndSend}>
                          Yes, send it
                        </button>
                      </div>
                    ) : (
                      <div className={actionRowClass}>
                        <button
                          type="button"
                          className={mainButtonClass}
                          disabled={!chosen || !subject.trim() || creating}
                          onClick={() => setConfirming(true)}
                        >
                          {creating ? 'Preparing…' : `Send to ${plural(chosen, 'person')}`}
                        </button>
                        {!chosen && (
                          <Span fontSize="text-xs" color="text-contrast-light">
                            {audience === 'all'
                              ? 'Nobody is subscribed yet. Add subscribers first.'
                              : 'Tick who it goes to under Audience first.'}
                          </Span>
                        )}
                      </div>
                    )}
                  </>
                )}

                {inProgress && totals && (
                  <div className="flex flex-col gap-3" role="status" aria-live="polite">
                    <Span fontSize="text-sm" fontWeight="font-semibold">
                      {send.phase === 'sending'
                        ? `Sending… ${handled.toLocaleString()} of ${totals.recipients.toLocaleString()}`
                        : send.phase === 'done'
                          ? `Done. Sent to ${plural(totals.sent, 'person')}.`
                          : send.phase === 'paused'
                            ? `Paused at ${handled.toLocaleString()} of ${totals.recipients.toLocaleString()}.`
                            : send.phase === 'idle'
                              ? 'Nobody to send to.'
                              : 'Sending stopped.'}
                    </Span>
                    <ProgressBar fraction={totals.recipients ? handled / totals.recipients : 0} />
                    {send.message && (
                      <Paragraph margin="mb-0" fontSize="text-xs" color="text-accent">
                        {send.message}
                      </Paragraph>
                    )}
                    <Span fontSize="text-xs" color="text-contrast-light">
                      {[
                        `${plural(totals.sent, 'email')} sent`,
                        totals.failed ? `${totals.failed.toLocaleString()} could not be sent` : '',
                        totals.skipped
                          ? `${totals.skipped.toLocaleString()} skipped (no longer subscribed by their turn)`
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Span>
                    <div className={actionRowClass}>
                      {send.phase === 'sending' && (
                        <button type="button" className={quietButtonClass} onClick={send.pause}>
                          Pause
                        </button>
                      )}
                      {(send.phase === 'paused' || send.phase === 'error') && campaign && totals.queued > 0 && (
                        <button type="button" className={mainButtonClass} onClick={() => send.start(campaign.id)}>
                          Resume ({plural(totals.queued, 'person')} waiting)
                        </button>
                      )}
                      {send.phase !== 'sending' && (
                        <>
                          <button type="button" className={mainButtonClass} onClick={() => setTab(REPORTS_TAB)}>
                            See the report
                          </button>
                          <button type="button" className={quietButtonClass} onClick={startOver}>
                            Prepare another
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {problem && (
                  <Paragraph margin="mb-0" fontSize="text-xs" color="text-accent">
                    {problem}
                  </Paragraph>
                )}
              </TabPanel>

              <TabPanel className="outline-none sm:h-full">
                <ReportsTab
                  postId={postId}
                  initialCampaignId={campaign?.id ?? null}
                  live={campaign}
                  sending={sending}
                  onResume={resume}
                  onExpired={expire}
                />
              </TabPanel>

              <TabPanel className="outline-none sm:h-full">
                <SubscribersManager onExpired={expire} />
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
