import type { FtConversion, FtEmailMode } from '@/utils/flow-trace-types'

// FlowTrace's settings for this site. No server-only import: the browser, the
// endpoint and the scheduled job in worker.ts all read it.
export const flowTraceConfig = {
  // The site's clock: days, summaries and times in reports.
  zone: 'America/Chicago',
  // A visit ends after this long with nothing done.
  visitIdleMinutes: 30,
  // The most steps of a visit the browser keeps; the oldest pages go first.
  maxSteps: 100,
  // Daily and weekly summaries go out at this hour, on the site's clock.
  digestHour: 8,
  // Weekly summaries go out on this day (1 is Monday).
  digestWeekday: 1,
  // At most this many reports an hour in all, and from any one IP address:
  // the endpoint is public, so a script could otherwise fill the inboxes.
  // Visits past the limit are still stored and shown in FlowTrace and the
  // summaries.
  reportsPerHour: 30,
  reportsPerAddressPerHour: 5,
  // A report that fails to send is tried again for this long.
  retryHours: 24,
  // What a person gets until they choose in FlowTrace's Email settings.
  defaultEmailMode: 'instant' as FtEmailMode,
  // Paths that are never traced.
  ignoredPaths: ['/api', '/block'],
  conversionLabels: {
    form: 'Contact form sent',
    newsletter: 'Newsletter sign-up',
    signup: 'Account created',
    email: 'Email link',
    call: 'Phone call',
    click: 'Tracked click',
  } satisfies Record<FtConversion, string>,
}

// Who gets the reports: FLOWTRACE_EMAILS (comma-separated), or EMAIL_TO, the
// inbox that gets the contact form, when it is not set. Handed the two values
// rather than reading process.env, so the scheduled job in worker.ts can pass
// its own environment.
export function flowTraceRecipients(
  list: string | undefined,
  fallback: string | undefined
): string[] {
  const addresses = (list?.trim() ? list : (fallback ?? ''))
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email))
  return [...new Set(addresses)]
}
