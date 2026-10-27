-- What WordPress's SEO plugin (Yoast) says about each post, category, tag and
-- author: a title and description written for search engines, and whether
-- the page is to be kept out of them. Empty or 0 where the plugin has nothing
-- of its own, and the site then works them out from the post or term itself.
-- Filled by Sync and Rebuild (src/utils/content-sync.ts) from yoast_head_json.
--
-- Authors also gain the picture and web address WordPress has for them.
--
-- Not in prisma/schema.prisma, for the same reason as the content index.

ALTER TABLE "posts" ADD COLUMN "seo_title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "posts" ADD COLUMN "seo_description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "posts" ADD COLUMN "noindex" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "terms" ADD COLUMN "seo_title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "terms" ADD COLUMN "seo_description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "terms" ADD COLUMN "noindex" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "authors" ADD COLUMN "seo_title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "authors" ADD COLUMN "seo_description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "authors" ADD COLUMN "noindex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "authors" ADD COLUMN "avatar" TEXT NOT NULL DEFAULT '';
ALTER TABLE "authors" ADD COLUMN "url" TEXT NOT NULL DEFAULT '';
