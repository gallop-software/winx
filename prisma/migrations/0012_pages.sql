-- WordPress pages (About, and any page tree), as the content
-- index knows them: enough to route a path to a page, draw the page tree on
-- /archives, list them in the sitemap and search them. The body of a page is
-- fetched from WordPress and kept in KV, like a post's.
-- Written by syncPages() in src/utils/content-sync.ts, read by
-- src/utils/pages.ts.
--
-- Not in prisma/schema.prisma, for the same reason as the content index.

-- CreateTable
CREATE TABLE "pages" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    -- The path as posts.url is written: no trailing slash, '/about',
    -- '/guides/hiring'.
    "path" TEXT NOT NULL,
    "parent_id" INTEGER NOT NULL DEFAULT 0,
    "menu_order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "modified_gmt" TEXT NOT NULL DEFAULT '',
    "seo_title" TEXT NOT NULL DEFAULT '',
    "seo_description" TEXT NOT NULL DEFAULT '',
    "noindex" INTEGER NOT NULL DEFAULT 0,
    -- The sync run that last saw the page in WordPress. A run removes the
    -- rows it did not see.
    "run" TEXT NOT NULL DEFAULT '',
    "synced_at" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_path_key" ON "pages"("path");

-- CreateIndex
CREATE INDEX "pages_parent_idx" ON "pages"("parent_id", "menu_order");
