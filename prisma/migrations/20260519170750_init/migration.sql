-- CreateTable
CREATE TABLE "blog_likes" (
    "post_id" INTEGER NOT NULL,
    "anon_id" TEXT NOT NULL,

    CONSTRAINT "blog_likes_pkey" PRIMARY KEY ("post_id","anon_id")
);

-- CreateTable
CREATE TABLE "subscribers" (
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscribers_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "blog_share_intents" (
    "post_id" INTEGER NOT NULL,
    "target" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_share_intents_pkey" PRIMARY KEY ("post_id","target")
);
