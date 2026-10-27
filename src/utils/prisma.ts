import { getCloudflareContext } from '@opennextjs/cloudflare'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { cache } from 'react'

// The DB binding from wrangler.jsonc. Typed here rather than through
// `npm run cf:typegen`, whose generated runtime types retype fetch's
// Response.json() as unknown across the whole app.
type Bindings = { DB: ConstructorParameters<typeof PrismaD1>[0] }

// D1 is reached through the Worker's DB binding, which only exists inside a
// request, so the client is built per request rather than once at module load.
export const getPrisma = cache(() => {
  const env = getCloudflareContext().env as unknown as Bindings
  return new PrismaClient({ adapter: new PrismaD1(env.DB) })
})
