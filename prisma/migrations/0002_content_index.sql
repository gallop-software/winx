-- The content index: what WordPress has published, kept in D1 so that lists of
-- posts, taxonomy pages, search and sitemaps update without a deploy. Written
-- by src/utils/content-sync.ts, read by src/utils/content-index.ts.
--
-- These tables are not in prisma/schema.prisma. They are read and written with
-- D1 statements, because a D1 batch is a transaction and Prisma on D1 is not.

-- CreateTable
CREATE TABLE "posts" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL,
    "date_gmt" TEXT NOT NULL,
    "modified" TEXT NOT NULL,
    "modified_gmt" TEXT NOT NULL,
    "featured_image" TEXT NOT NULL DEFAULT '',
    "featured_image_width" INTEGER,
    "featured_image_height" INTEGER,
    "author_id" INTEGER NOT NULL DEFAULT 0,
    "generation" INTEGER NOT NULL DEFAULT 0,
    "synced_at" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "posts_url_key" ON "posts"("url");

-- CreateIndex
CREATE INDEX "posts_slug_idx" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_date_idx" ON "posts"("date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "posts_author_date_idx" ON "posts"("author_id", "date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "posts_generation_idx" ON "posts"("generation");

-- CreateTable
CREATE TABLE "terms" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "taxonomy" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "generation" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "terms_taxonomy_slug_key" ON "terms"("taxonomy", "slug");

-- CreateTable
CREATE TABLE "post_terms" (
    "post_id" INTEGER NOT NULL,
    "term_id" INTEGER NOT NULL,
    "taxonomy" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("post_id", "term_id")
) WITHOUT ROWID;

-- CreateIndex
CREATE INDEX "post_terms_term_idx" ON "post_terms"("term_id", "post_id");

-- CreateTable
CREATE TABLE "authors" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "generation" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- Full-text search. rowid is the post id. No stemming, so names are matched as
-- written; remove_diacritics lets "cosi" find "Così".
CREATE VIRTUAL TABLE "posts_fts" USING fts5(
    title,
    excerpt,
    body,
    tokenize = 'unicode61 remove_diacritics 2',
    prefix = '2 3'
);

-- A match in the title counts ten times a match in the body.
INSERT INTO "posts_fts" ("posts_fts", "rank") VALUES ('rank', 'bm25(10.0, 4.0, 1.0)');

-- CreateTable
CREATE TABLE "sync_state" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
) WITHOUT ROWID;

INSERT INTO "sync_state" ("key", "value") VALUES ('generation', '0');
