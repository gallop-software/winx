'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
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
import { VisitsTab, type VisitFilter } from './visits-tab'

interface AnalyticsDialogProps {
  open: boolean
  onClose: () => void
  // The page the dialog was opened from, when the site counts its views:
  // its path, such as /2024/05/a-post/ or /about/.
  path?: string
  // The tab to open on. 'page' needs a path.
  initialTab?: 'site' | 'page'
}

const POST_PATH = /^\/\d{4}\/\d{2}\/[^/]+\/?$/

// How many people read the site, what they read and where they came from,
// counted by the site itself. Anywhere: the whole site and the log of
// visits. On a post: that post's own numbers as well. Only an administrator
// ever sees it, and every route it calls checks with WordPress that they
// still are one.
export function AnalyticsDialog({ open, onClose, path, initialTab }: AnalyticsDialogProps) {
  const { logOut } = useMember()
  const pageTab = POST_PATH.test(path ?? '') ? 'This post' : 'This page'
  const tabs = path ? ['Site', pageTab, 'Visits'] : ['Site', 'Visits']
  const visitsTab = tabs.length - 1

  const [tab, setTab] = useState(initialTab === 'page' && path ? 1 : 0)
  const [filter, setFilter] = useState<VisitFilter>({ ip: '', path: '' })
  // Goes up each time Refresh is pressed, and the tab on screen reads again:
  // views arrive while the box is open.
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
  const { demo } = useDemo()

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-overlay/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
        <DialogPanel className={panelClass}>
          <button type="button" onClick={onClose} aria-label="Close" className={closeClass}>
            <Icon icon={xMarkIcon} className="w-5 h-5" />
          </button>
          <DialogTitle as="div">
            <Heading as="h3" margin="mb-3" disableId>
              Analytics
            </Heading>
          </DialogTitle>
          {demo && (
            <Paragraph margin="mb-3" fontSize="text-xs" className="rounded-md bg-accent/10 px-3 py-2">
              <strong>Demo.</strong> These visits are made up, from the site&rsquo;s real posts. No
              real visitor&rsquo;s data is shown.
            </Paragraph>
          )}

          <TabGroup selectedIndex={tab} onChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <div className="relative shrink-0">
              <TabList className={tabListClass}>
                {tabs.map((name) => (
                  <Tab key={name} className={tabClass}>
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
                <Icon icon={arrowPath20Solid} className="h-4 w-4" />
                <Span fontSize="text-xs" className="hidden sm:inline">
                  Refresh
                </Span>
              </button>
            </div>

            <TabPanels className={bodyClass}>
              <TabPanel className="outline-none sm:h-full sm:overflow-y-auto sm:pr-1">
                <OverviewTab refreshed={refreshed} onExpired={expire} />
              </TabPanel>

              {path && (
                <TabPanel className="outline-none sm:h-full sm:overflow-y-auto sm:pr-1">
                  <OverviewTab
                    path={path}
                    refreshed={refreshed}
                    onSeeVisits={() => {
                      setFilter({ ip: '', path })
                      setTab(visitsTab)
                    }}
                    onExpired={expire}
                  />
                </TabPanel>
              )}

              <TabPanel className="outline-none sm:h-full">
                <VisitsTab
                  filter={filter}
                  onFilter={setFilter}
                  refreshed={refreshed}
                  onExpired={expire}
                />
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
