import { defineConfig } from 'prisma/config'

// The database is Cloudflare D1, reached through the Worker's DB binding, so
// Prisma never connects to it. Prisma only generates the client and the
// migration SQL; wrangler applies it (npm run db:migrate / db:migrate:local).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Never opened or created. `prisma migrate diff` prints nothing at all
  // unless a datasource URL is configured.
  datasource: {
    url: 'file:./prisma/unused.db',
  },
})
