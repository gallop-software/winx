-- The smaller copies WordPress keeps of each post's featured image, so lists
-- can offer the browser a size that fits instead of the original upload.
-- A JSON list of { url, w }, narrowest first, ending with the original.
-- Filled by Sync and Rebuild (src/utils/content-sync.ts). NULL means the post
-- has not been synced since this column was added, or has no featured image.
--
-- Not in prisma/schema.prisma, for the same reason as the content index.

ALTER TABLE "posts" ADD COLUMN "featured_image_sizes" TEXT;
