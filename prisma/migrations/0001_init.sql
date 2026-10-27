-- CreateTable
CREATE TABLE "blog_likes" (
    "post_id" INTEGER NOT NULL,
    "anon_id" TEXT NOT NULL,

    PRIMARY KEY ("post_id", "anon_id")
);

-- CreateTable
CREATE TABLE "subscribers" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT,
    "last_name" TEXT,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "blog_share_intents" (
    "post_id" INTEGER NOT NULL,
    "target" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("post_id", "target")
);
