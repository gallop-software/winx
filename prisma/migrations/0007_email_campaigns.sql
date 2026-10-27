-- Marketing email: a post sent to the WordPress users an administrator chose.
-- Written by src/utils/mailing.ts and src/utils/email-events.ts.
--
-- Whether someone is subscribed stays in WordPress. What is here is what was
-- sent, to whom, and what became of it: opens and clicks the site records
-- itself, and deliveries, bounces and complaints that Cloudflare reports.
--
-- Times are seconds since 1970.
--
-- Not in prisma/schema.prisma, for the same reason as the content index.

-- One mailing of one post. The email is rendered once, when the campaign is
-- made, so every recipient gets the same thing even if the post is edited
-- while it is going out. Only the links differ, filled in for each recipient.
-- CreateTable
CREATE TABLE "email_campaigns" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "post_id" INTEGER NOT NULL,
    "post_url" TEXT NOT NULL,
    "post_title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preheader" TEXT NOT NULL DEFAULT '',
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    -- draft, sending, paused, sent
    "status" TEXT NOT NULL DEFAULT 'draft',
    -- Why it is paused, such as Cloudflare's daily limit.
    "pause_reason" TEXT NOT NULL DEFAULT '',
    "created_by" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL,
    "started_at" INTEGER,
    "finished_at" INTEGER
);

-- CreateIndex
CREATE INDEX "email_campaigns_post_idx" ON "email_campaigns"("post_id", "created_at");

-- One row for each person a campaign goes to. The unique index is what keeps
-- anyone from being sent the same campaign twice.
-- CreateTable
CREATE TABLE "email_recipients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaign_id" INTEGER NOT NULL,
    -- The WordPress user, or 0 for an address that is not one.
    "user_id" INTEGER NOT NULL DEFAULT 0,
    -- Lower case.
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    -- queued, sending, sent, failed, skipped
    "status" TEXT NOT NULL DEFAULT 'queued',
    -- Cloudflare's id for the message, which its events carry.
    "message_id" TEXT,
    "error" TEXT NOT NULL DEFAULT '',
    "claimed_at" INTEGER,
    "sent_at" INTEGER,
    "delivered_at" INTEGER,
    "bounced_at" INTEGER,
    -- hard, soft, or what Cloudflare said when it was neither.
    "bounce_type" TEXT NOT NULL DEFAULT '',
    "complained_at" INTEGER,
    "unsubscribed_at" INTEGER,
    "opens_count" INTEGER NOT NULL DEFAULT 0,
    "first_opened_at" INTEGER,
    "clicks_count" INTEGER NOT NULL DEFAULT 0,
    "first_clicked_at" INTEGER,
    "last_event_at" INTEGER
);

-- CreateIndex
CREATE UNIQUE INDEX "email_recipients_campaign_email_key" ON "email_recipients"("campaign_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "email_recipients_message_key" ON "email_recipients"("message_id");

-- CreateIndex
CREATE INDEX "email_recipients_status_idx" ON "email_recipients"("campaign_id", "status", "id");

-- CreateIndex
CREATE INDEX "email_recipients_email_idx" ON "email_recipients"("email");

-- What happened to a message, one row each time: open, click, delivered,
-- deferred, bounced, failed, rejected, complained, unsubscribed. An event from
-- Cloudflare has its id here, so one delivered twice is counted once.
-- CreateTable
CREATE TABLE "email_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaign_id" INTEGER NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    -- The link, for a click.
    "url" TEXT NOT NULL DEFAULT '',
    "event_id" TEXT,
    "created_at" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "email_events_event_key" ON "email_events"("event_id");

-- CreateIndex
CREATE INDEX "email_events_recipient_idx" ON "email_events"("recipient_id", "created_at");

-- Addresses no campaign is sent to: they unsubscribed, the address does not
-- exist, or they marked a message as spam. Kept here as well as in WordPress
-- so that an unsubscribe counts at once, whether or not WordPress answers.
-- CreateTable
CREATE TABLE "email_suppressions" (
    -- Lower case.
    "email" TEXT NOT NULL PRIMARY KEY,
    -- unsubscribe, hard_bounce, complaint
    "reason" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL
);
