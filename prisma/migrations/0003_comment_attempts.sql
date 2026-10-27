-- One row for each comment the site sends on to WordPress. Counted to limit how
-- many one address may send, and to make each form token usable once. Rows
-- older than a day are removed when the next comment is sent. Written by
-- src/utils/comment-guard.ts.
--
-- The address is stored as a keyed hash, never as the address itself.
--
-- Not in prisma/schema.prisma, for the same reason as the content index.

-- CreateTable
CREATE TABLE "comment_attempts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ip_hash" TEXT NOT NULL,
    "post_id" INTEGER NOT NULL,
    "token_id" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "comment_attempts_token_key" ON "comment_attempts"("token_id");

-- CreateIndex
CREATE INDEX "comment_attempts_ip_idx" ON "comment_attempts"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "comment_attempts_created_idx" ON "comment_attempts"("created_at");
