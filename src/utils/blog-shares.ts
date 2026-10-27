import 'server-only'
import { DateTime } from 'luxon'
import { getPrisma } from '@/utils/prisma'

export async function getShareCounts(
  ids: number[]
): Promise<Record<number, number>> {
  if (ids.length === 0) return {}
  const intentRows = await getPrisma().blogShareIntent.groupBy({
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

export async function getShareCount(id: number): Promise<number> {
  const totals = await getShareCounts([id])
  return totals[id] ?? 0
}

// Returns the new share total for the post.
export async function recordShareIntent(
  postId: number,
  target: string
): Promise<number> {
  await getPrisma().blogShareIntent.upsert({
    where: { post_id_target: { post_id: postId, target } },
    create: { post_id: postId, target, count: 1 },
    update: {
      count: { increment: 1 },
      updated_at: DateTime.now().toJSDate(),
    },
  })
  return getShareCount(postId)
}
