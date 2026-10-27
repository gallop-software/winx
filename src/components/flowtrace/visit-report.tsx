'use client'

import clsx from 'clsx'
import arrowLeft20Solid from '@iconify/icons-heroicons/arrow-left-20-solid'
import fileTextIcon from '@iconify/icons-lucide/file-text'
import mailIcon from '@iconify/icons-lucide/mail'
import mousePointerClickIcon from '@iconify/icons-lucide/mouse-pointer-click'
import newspaperIcon from '@iconify/icons-lucide/newspaper'
import phoneIcon from '@iconify/icons-lucide/phone'
import sendIcon from '@iconify/icons-lucide/send'
import userPlusIcon from '@iconify/icons-lucide/user-plus'
import { Grid } from '@/components/grid'
import { Heading } from '@/components/heading'
import { Icon } from '@/components/icon'
import { Li, List } from '@/components/list'
import { Badge, formatTime, quietButtonClass } from '@/components/mailing/parts'
import { Paragraph } from '@/components/paragraph'
import { Span } from '@/components/span'
import { useFlowTraceRead } from '@/hooks/use-flow-trace'
import { flowTraceConfig } from '@/utils/flow-trace-config'
import {
  conversionLabel,
  deviceOf,
  formatClock,
  formatDuration,
  formatWhen,
  placeOf,
  sourceOf,
  visitHeadline,
  visitLength,
  visitOrdinal,
} from '@/utils/flow-trace-format'
import type { FtEventType, FtVisitReport } from '@/utils/flow-trace-types'
import { REPORT_STATUS, VisitTable } from './visit-table'

const EVENT_ICONS: Record<
  FtEventType,
  { body: string; width?: number; height?: number }
> = {
  pageview: fileTextIcon,
  form: sendIcon,
  newsletter: newspaperIcon,
  signup: userPlusIcon,
  email: mailIcon,
  call: phoneIcon,
  click: mousePointerClickIcon,
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <Span
        fontSize="text-xs"
        color="text-contrast-light"
      >
        {label}
      </Span>
      <Span
        fontSize="text-sm"
        className="break-words"
      >
        {value}
      </Span>
    </div>
  )
}

// What the report email's status means, in a sentence.
function statusNote(report: FtVisitReport): string {
  const { visit, sends } = report
  const failed = sends.filter((send) => !send.ok).length
  switch (visit.reportStatus) {
    case 'sent':
      return `Emailed ${visit.reportedAt ? formatWhen(visit.reportedAt) : ''}.`
    case 'waiting':
      return failed
        ? `It could not be sent yet. It is tried again every 10 minutes, for ${flowTraceConfig.retryHours} hours after the visit.`
        : 'It is on its way.'
    case 'failed':
      return `It could not be sent within ${flowTraceConfig.retryHours} hours, and was given up on.`
    case 'capped':
      return `Not emailed: more than ${flowTraceConfig.reportsPerHour} reports in an hour, or ${flowTraceConfig.reportsPerAddressPerHour} from one address. It is still in FlowTrace and the summaries.`
    case 'nobody':
      return 'Not emailed: nobody gets a report for each visit. It is in FlowTrace and the summaries.'
  }
}

interface VisitReportProps {
  id: string
  onBack: () => void
  onOpenVisit: (id: string) => void
  onExpired: () => void
  refreshed: number
}

// One converted visit: the facts about it, how its report email went, every
// step in order, and the visitor's other converted visits. What each
// FlowTrace email links to.
export function VisitReport({
  id,
  onBack,
  onOpenVisit,
  onExpired,
  refreshed,
}: VisitReportProps) {
  const read = useFlowTraceRead<FtVisitReport>(
    `/api/flowtrace/visit/?id=${encodeURIComponent(id)}`,
    onExpired,
    refreshed
  )
  const report = read.waiting ? null : read.value

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          type="button"
          className={quietButtonClass}
          onClick={onBack}
        >
          <Icon
            icon={arrowLeft20Solid}
            className="h-4 w-4"
          />
          Back
        </button>
      </div>

      {read.problem && (
        <Paragraph
          margin="mb-0"
          fontSize="text-xs"
          color="text-accent"
        >
          {read.problem}
        </Paragraph>
      )}
      {!report && !read.problem && (
        <Paragraph
          margin="mb-0"
          fontSize="text-xs"
          color="text-contrast-light"
        >
          Reading…
        </Paragraph>
      )}

      {report && (
        <ReportBody
          report={report}
          onOpenVisit={onOpenVisit}
        />
      )}
    </div>
  )
}

function ReportBody({
  report,
  onOpenVisit,
}: {
  report: FtVisitReport
  onOpenVisit: (id: string) => void
}) {
  const { visit, events, otherVisits, sends } = report
  const campaign = [visit.utmCampaign, visit.utmTerm, visit.utmContent]
    .filter(Boolean)
    .join(' / ')
  const status = REPORT_STATUS[visit.reportStatus]

  return (
    <>
      <header className="flex flex-col gap-1">
        <Span
          fontSize="text-xs"
          color="text-contrast-light"
        >
          {formatWhen(visit.startedAt)}
        </Span>
        <Heading
          as="h4"
          color="text-contrast"
          fontSize="text-xl"
          margin="mb-0"
          disableId
        >
          {visitHeadline(visit)}
        </Heading>
      </header>

      <Grid
        cols="grid-cols-2 lg:grid-cols-4"
        gap="gap-x-6 gap-y-4"
        className="rounded-md bg-accent/5 p-4"
      >
        <Fact
          label="Came from"
          value={sourceOf(visit)}
        />
        <Fact
          label="Campaign"
          value={campaign}
        />
        <Fact
          label="Where"
          value={placeOf(visit)}
        />
        <Fact
          label="Device"
          value={deviceOf(visit)}
        />
        <Fact
          label="Time reading"
          value={`${formatDuration(visit.engagedMs)} over ${visitLength(visit)}`}
        />
        <Fact
          label="Pages"
          value={String(visit.pageviews)}
        />
        <Fact
          label="Visit"
          value={
            visit.visitNumber > 1
              ? `${visitOrdinal(visit.visitNumber)}${visit.firstSeen ? ` · first seen ${formatWhen(visit.firstSeen)}` : ''}`
              : 'First visit'
          }
        />
        <Fact
          label="Across all visits"
          value={
            visit.visitNumber > 1 ? formatDuration(visit.visitorEngagedMs) : ''
          }
        />
        <Fact
          label="IP address"
          value={visit.ip}
        />
      </Grid>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Heading
            as="h4"
            color="text-contrast"
            fontSize="text-base"
            margin="mb-0"
            disableId
          >
            Report email
          </Heading>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <Paragraph
          margin="mb-0"
          fontSize="text-xs"
          color="text-contrast-light"
        >
          {statusNote(report)}
        </Paragraph>
        {sends.length > 0 && (
          <List
            variant="unstyled"
            spacing="tight"
            margin="mb-0"
            className="flex flex-col gap-1"
          >
            {sends.map((send, index) => (
              <Li
                key={`${send.email}-${send.at}-${index}`}
                className="text-xs"
              >
                <Span
                  fontSize="text-xs"
                  fontWeight="font-semibold"
                >
                  {send.ok ? 'Sent' : 'Not sent'}
                </Span>
                <Span
                  fontSize="text-xs"
                  color="text-contrast-light"
                >
                  {' '}
                  to {send.email} · {formatTime(send.at)}
                  {send.error ? ` · ${send.error}` : ''}
                </Span>
              </Li>
            ))}
          </List>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Heading
          as="h4"
          color="text-contrast"
          fontSize="text-base"
          margin="mb-0"
          disableId
        >
          What they did
        </Heading>
        <List
          variant="unstyled"
          spacing="tight"
          margin="mb-0"
          className="ml-3.5 border-l-2 border-contrast/10"
        >
          {events.map((event) => {
            const isPage = event.type === 'pageview'
            return (
              <Li
                key={event.id}
                className="relative py-2.5 pl-7"
              >
                <Span
                  className={clsx(
                    'absolute -left-[13px] top-2.5 flex h-6 w-6 items-center justify-center rounded-full',
                    isPage
                      ? 'bg-body text-contrast-light ring-1 ring-contrast/20'
                      : 'bg-accent text-accent-contrast'
                  )}
                >
                  <Icon
                    icon={EVENT_ICONS[event.type]}
                    className="h-3.5 w-3.5"
                  />
                </Span>
                <Paragraph
                  fontSize="text-xs"
                  color="text-contrast-light"
                  margin="mb-0"
                >
                  {formatClock(event.at)}
                  {isPage && event.engagedMs > 0 && (
                    <> · {formatDuration(event.engagedMs)} on the page</>
                  )}
                </Paragraph>
                {isPage ? (
                  <Paragraph
                    fontSize="text-sm"
                    margin="mb-0"
                  >
                    <a
                      href={event.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {event.title || event.path}
                    </a>{' '}
                    <Span
                      fontSize="text-xs"
                      color="text-contrast-light"
                    >
                      {event.path}
                    </Span>
                  </Paragraph>
                ) : (
                  <Paragraph
                    fontSize="text-sm"
                    margin="mb-0"
                    color="text-accent"
                    fontWeight="font-semibold"
                  >
                    {conversionLabel(event.type)}
                    {event.label && (
                      <Span color="text-contrast">: {event.label}</Span>
                    )}
                  </Paragraph>
                )}
              </Li>
            )
          })}
        </List>
      </section>

      {otherVisits.length > 0 && (
        <section className="flex flex-col gap-3">
          <Heading
            as="h4"
            color="text-contrast"
            fontSize="text-base"
            margin="mb-0"
            disableId
          >
            Their other converted visits
          </Heading>
          <VisitTable
            visits={otherVisits}
            onOpen={onOpenVisit}
            empty=""
          />
        </section>
      )}
    </>
  )
}
