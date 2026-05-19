import 'server-only'
import { prisma } from '@/utils/prisma'
import { kv, shareCountKey } from '@/utils/kv'

const TTL_SECONDS = 60 * 60 * 24 // 24h

export async function invalidateShare(id: number): Promise<void> {
  await kv.del(shareCountKey(id))
}

async function readShareCountsFromDb(
  ids: number[]
): Promise<Record<number, number>> {
  if (ids.length === 0) return {}
  const intentRows = await prisma.blogShareIntent.groupBy({
    by: ['post_id'],
    where: { post_id: { in: ids } },
    _sum: { count: true },
  })
  const totals: Record<number, number> = {}
  for (const id of ids) totals[id] = 0
  for (const r of intentRows)
    totals[r.post_id] = Number(r._sum.count ?? 0)
  return totals
}

export async function getShareCounts(
  ids: number[]
): Promise<Record<number, number>> {
  if (ids.length === 0) return {}
  const keys = ids.map(shareCountKey)
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
      writeP.set(shareCountKey(id), totals[id], { ex: TTL_SECONDS })
    }
    await writeP.exec()
  }

  return totals
}

export async function getShareCount(id: number): Promise<number> {
  const totals = await getShareCounts([id])
  return totals[id] ?? 0
}

// Postgres is source of truth; the share-count KV cache is invalidated.
// Returns the new share total computed directly from Postgres.
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
  const totals = await readShareCountsFromDb([postId])
  return totals[postId] ?? 0
}
