-- One row for each attempt to log in, sign up, or reset a password through the
-- site. Counted to limit how many one address, or one account, may make in a
-- while. Rows older than a day are removed when the next attempt is made.
-- Written by src/utils/member-guard.ts.
--
-- The address and the account are stored as keyed hashes, never as themselves.
--
-- Not in prisma/schema.prisma, for the same reason as the content index.

-- CreateTable
CREATE TABLE "member_attempts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kind" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "subject_hash" TEXT NOT NULL DEFAULT '',
    "created_at" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "member_attempts_ip_idx" ON "member_attempts"("kind", "ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "member_attempts_subject_idx" ON "member_attempts"("kind", "subject_hash", "created_at");

-- CreateIndex
CREATE INDEX "member_attempts_created_idx" ON "member_attempts"("created_at");
