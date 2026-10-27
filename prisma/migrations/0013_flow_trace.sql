-- FlowTrace: each visit that converted (a contact form, a newsletter
-- sign-up, an account, an email or phone link), what was done on it, who is
-- emailed about it and how each email went. Only visits that converted are
-- stored; every ordinary view is counted by Analytics (page_views and
-- page_view_log) and nowhere else. Written by /api/flow-trace
-- (src/utils/flow-trace-store.ts), read by the FlowTrace box, and reported
-- by the scheduled job in worker.ts.
--
-- Not in prisma/schema.prisma, for the same reason as the content index.

-- One visit: from arriving until 30 minutes pass with nothing done. Times are
-- Unix seconds. `id` and `visitor_id` are made by the visitor's browser.
CREATE TABLE "ft_visits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitor_id" TEXT NOT NULL,
    -- The visitor's how-manyth visit this is
    "visit_number" INTEGER NOT NULL DEFAULT 1,
    "started_at" INTEGER NOT NULL,
    "last_at" INTEGER NOT NULL,
    "entry_path" TEXT NOT NULL,
    -- The site they came from, as a host name; '' when they came from nowhere
    "referrer" TEXT NOT NULL DEFAULT '',
    "utm_source" TEXT NOT NULL DEFAULT '',
    "utm_medium" TEXT NOT NULL DEFAULT '',
    "utm_campaign" TEXT NOT NULL DEFAULT '',
    "utm_term" TEXT NOT NULL DEFAULT '',
    "utm_content" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "device" TEXT NOT NULL DEFAULT '',
    "browser" TEXT NOT NULL DEFAULT '',
    "os" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    -- Time the page was in front of them, summed over the visit
    "engaged_ms" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    -- What the first conversion was: form, newsletter, signup, email, call, click
    "first_conversion" TEXT NOT NULL DEFAULT '',
    -- When this browser first visited the site, as it says
    "first_seen" INTEGER,
    -- Time on the site across all of this browser's visits, this one included
    "visitor_engaged_ms" INTEGER NOT NULL DEFAULT 0,
    -- When the visit's report was settled, and how: waiting (not yet, or to be
    -- tried again), sent, failed, capped (past the hourly limit) or nobody
    "reported_at" INTEGER,
    "report_status" TEXT NOT NULL DEFAULT 'waiting'
);

CREATE INDEX "ft_visits_started_idx" ON "ft_visits"("started_at");
CREATE INDEX "ft_visits_visitor_idx" ON "ft_visits"("visitor_id", "started_at");
CREATE INDEX "ft_visits_unreported_idx" ON "ft_visits"("reported_at", "last_at");

-- What happened on a visit, in order: pageview, then each conversion.
CREATE TABLE "ft_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "visit_id" TEXT NOT NULL REFERENCES "ft_visits"("id") ON DELETE CASCADE,
    "at" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    -- What was clicked or sent: a link's text, an address, a form's name
    "label" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL DEFAULT '',
    -- For a pageview, the time the page was in front of them
    "engaged_ms" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "ft_events_visit_idx" ON "ft_events"("visit_id", "at");

-- Each attempt to email a visit's report to one person, and how it went:
-- what the visit's report shows under Email.
CREATE TABLE "ft_report_sends" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "visit_id" TEXT NOT NULL REFERENCES "ft_visits"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "at" INTEGER NOT NULL,
    "ok" INTEGER NOT NULL,
    -- Cloudflare's code when it did not go
    "error" TEXT NOT NULL DEFAULT ''
);

CREATE INDEX "ft_report_sends_visit_idx" ON "ft_report_sends"("visit_id", "at");

-- Which FlowTrace emails each person is sent: off, instant (a report for each
-- visit that converts), daily or weekly (a summary). Keyed by address, so an
-- address on the list that has never chosen still gets the default.
CREATE TABLE "ft_email_settings" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "updated_at" INTEGER NOT NULL
);

-- The summaries sent, so each goes once: kind is daily or weekly, period the
-- day it covers up to (2026-10-13).
CREATE TABLE "ft_digests" (
    "kind" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "sent_at" INTEGER NOT NULL,
    PRIMARY KEY ("kind", "period")
);
