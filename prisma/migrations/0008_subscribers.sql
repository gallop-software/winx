-- The mailing list, kept by the site. An email subscriber is anyone who
-- confirmed their address, a member who pressed Subscribe, or someone an
-- administrator added. It has nothing to do with having a WordPress account:
-- an account is for logging in and commenting.
-- Written by src/utils/subscribers.ts and src/utils/email-events.ts.
--
-- Nothing had been sent when this was made, so the marketing tables are
-- rebuilt rather than carried over.
--
-- Times are seconds since 1970.
--
-- Not in prisma/schema.prisma, for the same reason as the content index.

-- The template's own subscribers table, never used, and the list of addresses
-- not to write to, which is now a status on each subscriber.
-- DropTable
DROP TABLE IF EXISTS "subscribers";

-- DropTable
DROP TABLE IF EXISTS "email_suppressions";

-- CreateTable
CREATE TABLE "subscribers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    -- Lower case.
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT NOT NULL DEFAULT '',
    -- pending (waiting for them to confirm), subscribed, unsubscribed,
    -- bounced (the address does not exist), complained (marked a message as
    -- spam). Only subscribed is ever sent a campaign. The others are kept so
    -- the site remembers not to write to them.
    "status" TEXT NOT NULL DEFAULT 'pending',
    -- signup (the form on the site), member (a logged-in member pressed
    -- Subscribe), admin (added by an administrator).
    "source" TEXT NOT NULL DEFAULT 'signup',
    -- The WordPress account, when it is a member's own subscription.
    "user_id" INTEGER,
    "created_at" INTEGER NOT NULL,
    "updated_at" INTEGER NOT NULL,
    "confirmed_at" INTEGER,
    "unsubscribed_at" INTEGER
);

-- CreateIndex
CREATE UNIQUE INDEX "subscribers_email_key" ON "subscribers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscribers_user_key" ON "subscribers"("user_id");

-- CreateIndex
CREATE INDEX "subscribers_status_idx" ON "subscribers"("status", "id");

-- Who a campaign went to is now a subscriber, not a WordPress user.
-- DropTable
DROP TABLE IF EXISTS "email_recipients";

-- CreateTable
CREATE TABLE "email_recipients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaign_id" INTEGER NOT NULL,
    -- The subscriber, or NULL once they have been deleted. The address stays
    -- below, for the campaign's report.
    "subscriber_id" INTEGER,
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
CREATE INDEX "email_recipients_subscriber_idx" ON "email_recipients"("subscriber_id", "id");

-- Campaigns and their events from before had no real recipients.
DELETE FROM "email_events";

DELETE FROM "email_campaigns";
