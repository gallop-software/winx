import 'server-only'
import { prisma } from '@/utils/prisma'
import { kv, sharesKey } from '@/utils/kv'

const TTL_SECONDS = 60 * 60 * 24 // 24h

export async function invalidateShare(id: number): Promise<void> {
  await kv.del(sharesKey(id))
}

async function readShareCountFromDb(id: number): Promise<number> {
  const [seed, intent] = await Promise.all([
    prisma.blogPostSeed.findUnique({
      where: { post_id: id },
      select: { seed_count: true },
    }),
    prisma.blogShareIntent.aggregate({
      where: { post_id: id },
      _sum: { count: true },
    }),
  ])
  return Number(seed?.seed_count ?? 0) + Number(intent._sum.count ?? 0)
}

async function readShareCountsFromDb(
  ids: number[]
): Promise<Record<number, number>> {
  if (ids.length === 0) return {}
  const [seedRows, intentRows] = await Promise.all([
    prisma.blogPostSeed.findMany({
      where: { post_id: { in: ids } },
      select: { post_id: true, seed_count: true },
    }),
    prisma.blogShareIntent.groupBy({
      by: ['post_id'],
      where: { post_id: { in: ids } },
      _sum: { count: true },
    }),
  ])
  const totals: Record<number, number> = {}
  for (const id of ids) totals[id] = 0
  for (const r of seedRows)
    totals[r.post_id] = (totals[r.post_id] ?? 0) + Number(r.seed_count ?? 0)
  for (const r of intentRows)
    totals[r.post_id] = (totals[r.post_id] ?? 0) + Number(r._sum.count ?? 0)
  return totals
}

export async function getShareCount(id: number): Promise<number> {
  const cached = await kv.get<number | string>(sharesKey(id))
  if (cached != null) return Number(cached)
  const total = await readShareCountFromDb(id)
  await kv.set(sharesKey(id), total, { ex: TTL_SECONDS })
  return total
}

export async function getShareCounts(
  ids: number[]
): Promise<Record<number, number>> {
  if (ids.length === 0) return {}
  const keys = ids.map(sharesKey)
  const cached = (await kv.mget<(number | string | null)[]>(...keys)) ?? []

  const totals: Record<number, number> = {}
  const missing: number[] = []
  ids.forEach((id, i) => {
    const v = cached[i]
    if (v == null) missing.push(id)
    else totals[id] = Number(v)
  })

  if (missing.length > 0) {
    const fromDb = await readShareCountsFromDb(missing)
    const writeP = kv.pipeline()
    for (const id of missing) {
      totals[id] = fromDb[id] ?? 0
      writeP.set(sharesKey(id), totals[id], { ex: TTL_SECONDS })
    }
    await writeP.exec()
  }

  return totals
}

// Postgres is source of truth; KV is invalidated. Returns the new total
// computed directly from Postgres.
export async function recordShareIntent(
  postId: number,
  target: string
): Promise<number> {
  await prisma.$executeRaw`
    INSERT INTO blog_share_intents (post_id, target, count, updated_at)
    VALUES (${postId}, ${target}, 1, NOW())
    ON CONFLICT (post_id, target) DO UPDATE
      SET count = blog_share_intents.count + 1,
          updated_at = NOW()
  `
  await invalidateShare(postId)
  return readShareCountFromDb(postId)
}
