'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react'
import arrowPath20Solid from '@iconify/icons-heroicons/arrow-path-20-solid'
import xMarkIcon from '@iconify/icons-heroicons/x-mark'
import { Heading } from '@/components/heading'
import { Icon } from '@/components/icon'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import {
  bodyClass,
  closeClass,
  panelClass,
  tabClass,
  tabListClass,
} from '@/components/mailing/parts'
import { useDemo } from '@/hooks/use-demo'
import { useMember } from '@/hooks/use-member'
import { OverviewTab } from './overview-tab'
import { SettingsTab } from './settings-tab'
import { VisitReport } from './visit-report'
import { VisitsTab } from './visits-tab'

const TABS = ['Overview', 'Converted visits', 'Email settings'] as const
const VISITS_TAB = 1
const SETTINGS_TAB = 2

// What the box opens on: a tab, or one visit's report (what a FlowTrace
// email links to, as /?flowtrace=visit-<id>).
export type FlowTraceStart =
  | 'overview'
  | 'visits'
  | 'settings'
  | { visit: string }

interface FlowTraceDialogProps {
  open: boolean
  onClose: () => void
  start?: FlowTraceStart
}

// FlowTrace: the visits that converted (the contact form, a newsletter
// sign-up, a new account, an email or phone link) and the report email each
// one sent. It looks and reads like Analytics, whose visit counts it is
// measured against; ordinary views stay in Analytics. Only an administrator
// ever sees it, and every route it calls checks with WordPress that they
// still are one.
export function FlowTraceDialog({
  open,
  onClose,
  start = 'overview',
}: FlowTraceDialogProps) {
  const { logOut } = useMember()
  const { demo } = useDemo()
  const [tab, setTab] = useState(
    start === 'visits' ? VISITS_TAB : start === 'settings' ? SETTINGS_TAB : 0
  )
  // The visit whose report is on screen, over the tabs.
  const [visit, setVisit] = useState<string | null>(
    typeof start === 'object' ? start.visit : null
  )
  const [refreshed, setRefreshed] = useState(0)

  // Kept in a ref so the tabs do not read everything again each time the
  // page around the dialog renders.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  const expire = useCallback(() => {
    closeRef.current()
    logOut()
  }, [logOut])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="relative z-50"
    >
      <div
        className="fixed inset-0 bg-overlay/30"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <DialogPanel className={panelClass}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={closeClass}
          >
            <Icon
              icon={xMarkIcon}
              className="w-5 h-5"
            />
          </button>
          <DialogTitle as="div">
            <Heading
              as="h3"
              margin="mb-3"
              disableId
            >
              FlowTrace
            </Heading>
          </DialogTitle>
          {demo && (
            <Paragraph
              margin="mb-3"
              fontSize="text-xs"
              className="rounded-md bg-accent/10 px-3 py-2"
            >
              <strong>Demo.</strong> These converted visits and their report
              emails are made up, from the site&rsquo;s real posts. No real
              reader&rsquo;s data is shown. Under Email settings you can send
              yourself one test report on a made-up visit.
            </Paragraph>
          )}

          <TabGroup
            selectedIndex={tab}
            onChange={(index) => {
              setTab(index)
              setVisit(null)
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="relative shrink-0">
              <TabList className={tabListClass}>
                {TABS.map((name) => (
                  <Tab
                    key={name}
                    className={tabClass}
                  >
                    {name}
                  </Tab>
                ))}
              </TabList>
              <button
                type="button"
                onClick={() => setRefreshed((count) => count + 1)}
                aria-label="Refresh"
                title="Read the numbers again"
                className="absolute right-0 top-0 inline-flex cursor-pointer items-center gap-1.5 bg-body py-2 pl-3 text-xs font-medium text-contrast transition-opacity hover:opacity-70"
              >
                <Icon
                  icon={arrowPath20Solid}
                  className="h-4 w-4"
                />
                <Span
                  fontSize="text-xs"
                  className="hidden sm:inline"
                >
                  Refresh
                </Span>
              </button>
            </div>

            {visit ? (
              <div className={`${bodyClass} sm:overflow-y-auto sm:pr-1`}>
                <VisitReport
                  id={visit}
                  onBack={() => setVisit(null)}
                  onOpenVisit={setVisit}
                  onExpired={expire}
                  refreshed={refreshed}
                />
              </div>
            ) : (
              <TabPanels className={bodyClass}>
                <TabPanel className="outline-none sm:h-full sm:overflow-y-auto sm:pr-1">
                  <OverviewTab
                    onOpenVisit={setVisit}
                    onSeeAll={() => setTab(VISITS_TAB)}
                    onExpired={expire}
                    refreshed={refreshed}
                  />
                </TabPanel>
                <TabPanel className="outline-none sm:h-full">
                  <VisitsTab
                    onOpenVisit={setVisit}
                    onExpired={expire}
                    refreshed={refreshed}
                  />
                </TabPanel>
                <TabPanel className="outline-none sm:h-full sm:overflow-y-auto sm:pr-1">
                  <SettingsTab
                    onExpired={expire}
                    refreshed={refreshed}
                  />
                </TabPanel>
              </TabPanels>
            )}
          </TabGroup>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
