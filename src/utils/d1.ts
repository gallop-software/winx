import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// The parts of the DB binding the content index uses, typed here for the same
// reason as the binding in src/utils/prisma.ts.
// What a statement did. `changes` is how many rows it wrote.
export type D1Meta = { changes?: number }

export type D1Statement = {
  bind(...values: unknown[]): D1Statement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  run(): Promise<{ meta?: D1Meta }>
}

export type D1 = {
  prepare(sql: string): D1Statement
  // Runs the statements in order as one transaction: if one fails, none of
  // them are kept.
  batch<T = Record<string, unknown>>(
    statements: D1Statement[]
  ): Promise<{ results: T[]; meta?: D1Meta }[]>
}

// The binding only exists inside a request, so this is called per request
// rather than once at module load.
export function getDb(): D1 {
  const env = getCloudflareContext().env as unknown as { DB?: D1 }
  if (!env.DB) throw new Error('The DB binding is not configured')
  return env.DB
}
