'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import arrowDownTray20Solid from '@iconify/icons-heroicons/arrow-down-tray-20-solid'
import arrowPath20Solid from '@iconify/icons-heroicons/arrow-path-20-solid'
import circleStack20Solid from '@iconify/icons-heroicons/circle-stack-20-solid'
import documentText20Solid from '@iconify/icons-heroicons/document-text-20-solid'
import envelope20Solid from '@iconify/icons-heroicons/envelope-20-solid'
import funnel20Solid from '@iconify/icons-heroicons/funnel-20-solid'
import globeAlt20Solid from '@iconify/icons-heroicons/globe-alt-20-solid'
import pencilSolidIcon from '@iconify/icons-heroicons/pencil-solid'
import squares2x2Icon from '@iconify/icons-heroicons/squares-2x2'
import trash20Solid from '@iconify/icons-heroicons/trash-20-solid'
import xMark20Solid from '@iconify/icons-heroicons/x-mark-20-solid'
import rotateCwIcon from '@iconify/icons-lucide/rotate-cw'
import wordpressIcon from '@iconify/icons-simple-icons/wordpress'
import clsx from 'clsx'
import { Icon } from '@/components/icon'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import { useContentSync } from '@/hooks/use-content-sync'
import { useDemo } from '@/hooks/use-demo'
import { MailingSessionExpired, mailingCall } from '@/hooks/use-mailing'
import { useMember } from '@/hooks/use-member'
import { state, useSnapshot } from '@/state'
import type { FlowTraceStart } from '@/components/flowtrace'
import type { LiveCounts } from '@/utils/page-view-types'

type Confirming = 'rebuild' | 'clear' | null
type IconData = { body: string; width?: number; height?: number }

// Only an administrator ever opens it, so its code is not sent to anyone
// else's browser.
const MailingDialog = dynamic(
  () => import('@/components/mailing').then((module) => module.MailingDialog),
  { ssr: false }
)
const AnalyticsDialog = dynamic(
  () =>
    import('@/components/analytics').then((module) => module.AnalyticsDialog),
  { ssr: false }
)
const FlowTraceDialog = dynamic(
  () =>
    import('@/components/flowtrace').then((module) => module.FlowTraceDialog),
  { ssr: false }
)

// What ?flowtrace= asks the FlowTrace box to open on: a FlowTrace email's
// link to one visit (visit-<id>), a tab, or the box as it opens.
function flowTraceStart(asked: string): FlowTraceStart {
  if (asked.startsWith('visit-')) return { visit: asked.slice(6) }
  if (asked === 'visits' || asked === 'settings') return asked
  return 'overview'
}

const POST_PATH = /^\/\d{4}\/\d{2}\/[^/]+\/?$/

// Where WordPress is, for the link to its dashboard.
const wordPressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL ?? ''

// How long the refresh icon turns for at the least, in milliseconds.
const SPIN_AT_LEAST = 600

// The height of the bar: h-12 here, --admin-bar in tailwind.css. The two
// must agree. Its text is the site's own small text (text-xs, medium, the
// body font), the size the navigation uses.
// On a phone the whole bar scrolls sideways as one row; from md up it fits,
// the buttons on the left and the numbers on the right.
const barClass =
  'fixed inset-x-0 top-0 z-45 flex h-12 items-stretch overflow-x-auto scrollbar-hide bg-toolbar text-overlay-text shadow-md font-body md:overflow-visible'
const toolClass =
  'inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 px-3 text-overlay-text transition-colors outline-none hover:bg-overlay-text/10 focus-visible:bg-overlay-text/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent'
const barText = 'text-xs'
const iconClass = 'h-5 w-5 shrink-0'

interface ToolProps {
  icon: IconData
  // The word beside the icon, from xl up.
  label: string
  // The full name, for screen readers.
  tip: string
  href?: string
  onClick?: () => void
  disabled?: boolean
}

// One control of the bar: a button, or with `href` a link to WordPress.
function Tool({ icon, label, tip, href, onClick, disabled }: ToolProps) {
  const inside = (
    <>
      <Icon
        className={iconClass}
        icon={icon}
      />
      <Span
        color="text-overlay-text"
        fontSize={barText}
        fontWeight="font-medium"
        lineHeight="leading-none"
        className="hidden xl:inline"
      >
        {label}
      </Span>
    </>
  )
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={tip}
      className={toolClass}
    >
      {inside}
    </a>
  ) : (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={tip}
      className={toolClass}
    >
      {inside}
    </button>
  )
}

interface StatProps {
  icon: IconData
  // "Site" or "This page", for the tooltip, and what the bar shows beside
  // the icon ("Site · today", "This page").
  name: string
  label: string
  // What the number covers, for the tooltip: "today" or "all time".
  period: string
  // The number and what it counts. Null while it is being read.
  value: number | null
  unit: 'views' | 'visitors'
  // Set while the number is being read, or could not be.
  waiting: boolean
  problem: string
  onClick: () => void
}

// One number over `period`: the site's visitors today, or the page's views
// in its whole life. With its word where the bar has room for
// it (lg to xl, where the buttons are icons alone, and from 2xl up), the
// number alone elsewhere. Pressing it opens the analytics on the matching
// tab.
function Stat({
  icon,
  name,
  label,
  period,
  value,
  unit,
  waiting,
  problem,
  onClick,
}: StatProps) {
  const number = value === null ? '—' : value.toLocaleString()
  const tip = problem
    ? `${name}: ${problem}`
    : value === null
      ? `${name}, ${period}: reading…`
      : `${name}, ${period}: ${number} ${unit}`
  const text = (visible: string, children: React.ReactNode) => (
    <Span
      color="text-overlay-text"
      fontSize={barText}
      fontWeight="font-medium"
      lineHeight="leading-none"
      className={clsx('tabular-nums', visible, waiting && 'opacity-60')}
    >
      {children}
    </Span>
  )
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tip}
      className={toolClass}
    >
      <Icon
        className={clsx(iconClass, 'opacity-70')}
        icon={icon}
      />
      <Span
        color="text-overlay-text"
        fontSize={barText}
        fontWeight="font-medium"
        lineHeight="leading-none"
        className="hidden lg:inline opacity-70"
      >
        {label}
      </Span>
      {text('hidden lg:inline xl:hidden 2xl:inline', `${number} ${unit}`)}
      {text('lg:hidden xl:inline 2xl:hidden', number)}
    </button>
  )
}

// The toolbar an administrator gets across the top of every page, like
// WordPress's own. On the left, the buttons: the WordPress dashboard, Sync
// and Rebuild for the content index, Clear all cache, Marketing email (on a post, the post and
// its campaigns; anywhere, the subscribers), and on a post or a WordPress
// page, Edit in WordPress and Revalidate. A page that was not found gets
// Revalidate too, so a post or page published since the last Sync can be
// fetched from where it answers 404. The numbers open Analytics. On the right, the site's visitors today
// and the page's views in its whole life, read once each time a page loads.
// The cookie says whether to show the bar; every route it calls asks
// WordPress again before doing anything.
export function AdminBar() {
  const pathname = usePathname()
  const router = useRouter()
  const snap = useSnapshot(state)
  const sync = useContentSync()
  const [confirming, setConfirming] = useState<Confirming>(null)
  // The outcome of Revalidate or Clear all cache.
  const [notice, setNotice] = useState('')
  const [noticeExpired, setNoticeExpired] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [mailingOpen, setMailingOpen] = useState(false)
  const [analytics, setAnalytics] = useState<'site' | 'page' | null>(null)
  const [flowTrace, setFlowTrace] = useState<FlowTraceStart | null>(null)
  // Whether the page shown is a WordPress page: its block marks its section
  // (src/app/(default)/[...path]/_blocks/wp-page.tsx).
  const [isWpPage, setIsWpPage] = useState(false)
  // Whether the page shown is a 404: src/components/not-found-content.tsx
  // marks its body.
  const [isNotFound, setIsNotFound] = useState(false)

  // The numbers on the right. `read` says which page and which press they
  // were read for; until it matches `wanted`, they are on their way.
  const [refreshed, setRefreshed] = useState(0)
  const [counts, setCounts] = useState<{
    read: string
    value: LiveCounts
  } | null>(null)
  // Why the last read failed, if it did, and which read it was.
  const [countsProblem, setCountsProblem] = useState<{
    read: string
    message: string
  } | null>(null)

  const { logOut } = useMember()
  const isAdmin = snap.member?.isAdmin === true
  // The demo shows the bar to a visitor, with made-up numbers and lists,
  // and buttons that say what they would do rather than doing it.
  const {
    enabled: demoEnabled,
    demo,
    start: startDemo,
    end: endDemo,
  } = useDemo()
  const showing = isAdmin || demo
  const wanted = `${pathname}|${refreshed}`

  // A FlowTrace email's link: /?flowtrace=visit-<id> opens that visit's
  // report. Read in the browser, so the page itself stays the same for
  // everyone. Someone not logged in is asked to first, and the link is kept
  // until they are.
  useEffect(() => {
    if (!snap.memberLoaded) return
    const url = new URL(window.location.href)
    const asked = url.searchParams.get('flowtrace')
    if (asked === null) return
    if (!showing) {
      // A demo test report's link: the demo opens, then the box.
      if (asked === 'demo' && demoEnabled) startDemo()
      else if (!snap.member) state.loginOpen = true
      return
    }
    setFlowTrace(flowTraceStart(asked))
    url.searchParams.delete('flowtrace')
    window.history.replaceState(
      window.history.state,
      '',
      url.pathname + url.search + url.hash
    )
  }, [snap.memberLoaded, snap.member, showing, demoEnabled, startDemo])

  useEffect(() => {
    setIsWpPage(document.querySelector('[data-wp-page]') !== null)
    setIsNotFound(document.querySelector('[data-not-found]') !== null)
  }, [pathname])

  // What changed is shown as soon as it is known, by asking the server for
  // the page again in place: the page is rebuilt (the cache was cleared)
  // and React swaps the new content in behind the notice, with no reload,
  // so the scroll position and the bar's own state stay. Revalidate and
  // Clear cache refresh in post(); Sync and Rebuild here, once their run
  // has ended with something changed.
  useEffect(() => {
    if (sync.changed && sync.phase !== 'working' && sync.phase !== 'idle') {
      router.refresh()
    }
  }, [sync.changed, sync.phase, router])

  // The page makes room for the bar (tailwind.css) once <html> says it is
  // showing.
  useEffect(() => {
    if (!showing) return
    document.documentElement.dataset.adminBar = ''
    return () => {
      delete document.documentElement.dataset.adminBar
    }
  }, [showing])

  useEffect(() => {
    if (!showing) return
    let stale = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const started = performance.now()
    const query = new URLSearchParams({ path: pathname })
    // A press of the refresh button spins its icon for long enough to be
    // seen, even when the answer is back at once.
    const settle = (done: () => void) => {
      if (stale) return
      const remaining =
        refreshed > 0 ? SPIN_AT_LEAST - (performance.now() - started) : 0
      timer = setTimeout(done, Math.max(0, remaining))
    }
    mailingCall<LiveCounts>(`/api/analytics/live/?${query}`)
      .then((value) => {
        settle(() => {
          setCounts({ read: wanted, value })
          setCountsProblem(null)
        })
      })
      .catch((error: unknown) => {
        if (stale) return
        if (error instanceof MailingSessionExpired) {
          logOut()
          return
        }
        const message =
          (error as Error).message || 'The numbers could not be read.'
        // Shown as a dash on the bar; the reason is here.
        console.error(`Admin toolbar: ${message}`)
        settle(() => setCountsProblem({ read: wanted, message }))
      })
    return () => {
      stale = true
      clearTimeout(timer)
    }
    // `demo` is here so the numbers are read again when the bar turns from
    // the demo into the real one, and made-up numbers never stay on it.
  }, [showing, demo, pathname, wanted, refreshed, logOut])

  if (!showing) {
    // On a site that turns the demo on, anyone but an administrator gets a
    // button in the top right corner that opens it. Waits until the login
    // is known, so an administrator never sees it flash.
    if (!demoEnabled || !snap.memberLoaded) return null
    return (
      <button
        type="button"
        onClick={startDemo}
        className="fixed top-3 right-3 z-45 inline-flex cursor-pointer items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-accent-contrast shadow-lg transition-colors hover:bg-accent-dark font-body"
      >
        <Icon
          className="h-4 w-4 shrink-0"
          icon={squares2x2Icon}
        />
        <Span
          color="text-accent-contrast"
          fontSize={barText}
          fontWeight="font-medium"
          lineHeight="leading-none"
        >
          Try the admin toolbar
        </Span>
      </button>
    )
  }

  const isPost = POST_PATH.test(pathname)
  // What Edit in WordPress and Revalidate apply to: a post or a page.
  // Revalidate also on a 404, which is a post or page the index does not
  // know yet.
  const isEditable = isPost || isWpPage
  const isWorking = sync.phase === 'working'
  const isOpen =
    confirming !== null || notice !== '' || isBusy || sync.phase !== 'idle'
  const problem = countsProblem?.read === wanted ? countsProblem.message : ''
  const countsWaiting = counts?.read !== wanted && !problem
  // The refresh icon turns for a press of its button, not for the read a
  // page makes as it loads.
  const spinning = countsWaiting && refreshed > 0
  const live = counts?.value ?? null
  // The page's own numbers, when the site counts this page. Kept from the
  // last read while a new one is on its way, but not across pages.
  const pageCount =
    live && counts?.read.startsWith(`${pathname}|`) ? live.page : null

  const close = () => {
    const expired = sync.phase === 'expired' || noticeExpired

    setConfirming(null)
    setNotice('')
    setNoticeExpired(false)
    sync.reset()

    if (expired) logOut()
  }

  // What a button would do, said instead of done.
  const demoNotice = (what: string) => {
    setConfirming(null)
    setNotice(
      `${what} This is the demo, so nothing was changed. An administrator's toolbar does this for real.`
    )
  }

  const post = async (
    url: string,
    body: unknown,
    done: string,
    failed: string
  ) => {
    setConfirming(null)
    setIsBusy(true)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const expired = response.status === 401
      setNoticeExpired(expired)
      setNotice(
        expired ? 'Session expired. Log in again.' : response.ok ? done : failed
      )
      if (response.ok) router.refresh()
    } catch {
      setNotice(failed)
    } finally {
      setIsBusy(false)
    }
  }

  const dialogButtonClass =
    'text-xs rounded-md py-2 px-4 cursor-pointer transition-colors'
  const quietButtonClass = `${dialogButtonClass} border border-contrast/20 text-contrast hover:bg-accent/5`
  const mainButtonClass = `${dialogButtonClass} bg-accent text-accent-contrast hover:bg-accent-dark`

  const message =
    confirming === 'rebuild'
      ? 'Read every post from WordPress again? This takes a few minutes, and removes posts WordPress no longer has.'
      : confirming === 'clear'
        ? 'Clear the cache for every post?'
        : isBusy
          ? 'Working…'
          : notice || sync.message || sync.progress?.label || ''

  return (
    <>
      <div
        className={barClass}
        role="toolbar"
        aria-label="Administration"
      >
        <div className="flex shrink-0 items-stretch md:min-w-0 md:flex-1">
          {demo && (
            <Span
              color="text-toolbar"
              fontSize={barText}
              fontWeight="font-semibold"
              lineHeight="leading-none"
              className="inline-flex shrink-0 items-center self-center mx-3 rounded-full bg-overlay-text px-2.5 py-1 uppercase tracking-wider"
            >
              Demo
            </Span>
          )}
          {wordPressUrl && !demo && (
            <Tool
              icon={wordpressIcon}
              label="WordPress"
              tip="WordPress dashboard"
              href={`${wordPressUrl}/wp-admin/`}
            />
          )}
          <Tool
            icon={arrowDownTray20Solid}
            label="Sync"
            tip="Sync new posts from WordPress"
            onClick={
              demo
                ? () =>
                    demoNotice(
                      'Sync reads the posts published or changed in WordPress since the last sync into the site.'
                    )
                : sync.runSync
            }
            disabled={isWorking}
          />
          <Tool
            icon={circleStack20Solid}
            label="Rebuild"
            tip="Rebuild the content index"
            onClick={() =>
              demo
                ? demoNotice(
                    'Rebuild reads every post, page, category and tag from WordPress again.'
                  )
                : setConfirming('rebuild')
            }
            disabled={isWorking}
          />
          <Tool
            icon={trash20Solid}
            label="Clear cache"
            tip="Clear all cache"
            onClick={() =>
              demo
                ? demoNotice(
                    'Clear cache throws away every saved page, so each is built fresh on its next visit.'
                  )
                : setConfirming('clear')
            }
          />
          <Tool
            icon={funnel20Solid}
            label="FlowTrace"
            tip="FlowTrace: the visits that converted and their report emails"
            onClick={() => setFlowTrace('overview')}
          />
          <Tool
            icon={envelope20Solid}
            label="Email"
            tip={isPost ? 'Send this post as a marketing email' : 'Subscribers'}
            onClick={() => setMailingOpen(true)}
          />
          {isEditable && snap.editTarget && !demo && (
            <Tool
              icon={pencilSolidIcon}
              label="Edit"
              tip="Edit in WordPress"
              href={`${snap.editTarget.wpUrl}/wp-admin/post.php?post=${snap.editTarget.databaseId}&action=edit`}
            />
          )}
          {(isEditable || isNotFound) && (
            <Tool
              icon={arrowPath20Solid}
              label="Revalidate"
              tip="Revalidate this page"
              onClick={() =>
                demo
                  ? demoNotice(
                      'Revalidate reads this page from WordPress again and saves the new copy.'
                    )
                  : post(
                      '/api/revalidate/',
                      { path: pathname },
                      'Page revalidated successfully!',
                      'Failed to revalidate the page.'
                    )
              }
            />
          )}
        </div>

        <div className="flex shrink-0 items-stretch">
          <Stat
            icon={globeAlt20Solid}
            name="Site"
            label="Site · today"
            period="today"
            value={live?.site.visitors ?? null}
            unit="visitors"
            waiting={countsWaiting}
            problem={problem}
            onClick={() => setAnalytics('site')}
          />
          {pageCount && (
            <Stat
              icon={documentText20Solid}
              name="This page"
              label="This page"
              period="all time"
              value={pageCount.views}
              unit="views"
              waiting={countsWaiting}
              problem={problem}
              onClick={() => setAnalytics('page')}
            />
          )}
          <button
            type="button"
            onClick={() => setRefreshed((count) => count + 1)}
            disabled={countsWaiting}
            aria-label="Read the numbers again"
            className={clsx(toolClass, 'disabled:opacity-100')}
          >
            <Icon
              className={clsx(
                iconClass,
                'opacity-70',
                spinning && 'animate-spin'
              )}
              icon={rotateCwIcon}
            />
          </button>
          {demo && (
            <Tool
              icon={xMark20Solid}
              label="Exit demo"
              tip="Exit the toolbar demo"
              onClick={endDemo}
            />
          )}
        </div>
      </div>

      <Dialog
        open={isOpen}
        // A rebuild keeps going until it is cancelled or done, so clicking
        // away does not close it.
        onClose={() => {
          if (!isWorking && !isBusy) close()
        }}
        className="relative z-50"
      >
        <div
          className="fixed inset-0 bg-overlay/30"
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto w-full max-w-sm rounded bg-body p-6 shadow-lg">
            <DialogTitle
              as={Paragraph}
              margin="mb-0"
            >
              {message}
            </DialogTitle>
            {isWorking && sync.progress && (
              <div
                className="mt-4 h-2 w-full overflow-hidden rounded-full bg-accent/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(sync.progress.fraction * 100)}
              >
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${sync.progress.fraction * 100}%` }}
                />
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              {confirming === 'rebuild' && (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className={quietButtonClass}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(null)
                      sync.runRebuild()
                    }}
                    className={mainButtonClass}
                  >
                    Rebuild
                  </button>
                </>
              )}
              {confirming === 'clear' && (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className={quietButtonClass}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      post(
                        '/api/clear-cache/',
                        {},
                        'Cache cleared for all posts.',
                        'Failed to clear the cache.'
                      )
                    }
                    className={mainButtonClass}
                  >
                    Clear Cache
                  </button>
                </>
              )}
              {confirming === null && isWorking && (
                <button
                  type="button"
                  onClick={sync.cancel}
                  className={quietButtonClass}
                >
                  Cancel
                </button>
              )}
              {confirming === null && sync.phase === 'confirm' && (
                <>
                  <button
                    type="button"
                    onClick={close}
                    className={quietButtonClass}
                  >
                    Keep Them
                  </button>
                  <button
                    type="button"
                    onClick={sync.confirmRemoval}
                    className={mainButtonClass}
                  >
                    Remove
                  </button>
                </>
              )}
              {confirming === null &&
                !isWorking &&
                !isBusy &&
                sync.phase !== 'confirm' && (
                  <button
                    type="button"
                    onClick={close}
                    className={mainButtonClass}
                  >
                    Close
                  </button>
                )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
      {mailingOpen && (
        <MailingDialog
          open
          onClose={() => setMailingOpen(false)}
          {...(isPost && snap.editTarget
            ? { postId: snap.editTarget.databaseId, path: pathname }
            : {})}
        />
      )}
      {flowTrace && (
        <FlowTraceDialog
          open
          onClose={() => setFlowTrace(null)}
          start={flowTrace}
        />
      )}
      {analytics && (
        <AnalyticsDialog
          open
          onClose={() => setAnalytics(null)}
          initialTab={analytics}
          {...(pageCount ? { path: pathname } : {})}
        />
      )}
    </>
  )
}
