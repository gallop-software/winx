-- How many approved comments each post has, and whether it takes new ones,
-- so lists can show a count without asking WordPress. Filled by Sync and
-- Rebuild (src/utils/content-sync.ts), and whenever a post's comments are read
-- from WordPress (src/utils/comments.ts). NULL means not counted yet.
--
-- Not in prisma/schema.prisma, for the same reason as the content index.

ALTER TABLE "posts" ADD COLUMN "comment_count" INTEGER;
ALTER TABLE "posts" ADD COLUMN "comment_open" INTEGER NOT NULL DEFAULT 1;
