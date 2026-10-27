-- The addresses the toolbar demo has emailed, one row per kind of email and
-- address, so each address gets each demo email once. Only a keyed hash of
-- the address is kept, never the address itself (src/app/api/demo/email).
CREATE TABLE "demo_sends" (
    "kind" TEXT NOT NULL,
    "address_hash" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL,
    PRIMARY KEY ("kind", "address_hash")
);
