-- Visitors: how many different people a day's views came from, told apart by
-- IP address. Counted for the whole site (kind 'total') and for each page
-- (kind 'path'); the other kinds leave it at 0. Written by
-- src/utils/page-views.ts, which asks the log whether the address has been
-- seen yet that day.
--
-- Days counted before this column existed keep 0.

-- AlterTable
ALTER TABLE "page_views" ADD COLUMN "visitors" INTEGER NOT NULL DEFAULT 0;
