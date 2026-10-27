import 'server-only'
import { getPrisma } from '@/utils/prisma'

export async function getLikeCountFromDb(id: number): Promise<number> {
  return getPrisma().blogLike.count({ where: { post_id: id } })
}

// Batch read: one query returns every like for the requested posts, from which
// both the counts and whether this visitor liked each post are derived.
export async function getLikesBatch(
  ids: number[],
  anonId: string | null
): Promise<{
  counts: Record<number, number>
  liked: Record<number, boolean>
}> {
  if (ids.length === 0) return { counts: {}, liked: {} }

  const rows = await getPrisma().blogLike.findMany({
    where: { post_id: { in: ids } },
    select: { post_id: true, anon_id: true },
  })

  const byPost = new Map<number, string[]>()
  for (const id of ids) byPost.set(id, [])
  for (const row of rows) byPost.get(row.post_id)?.push(row.anon_id)

  const counts: Record<number, number> = {}
  const liked: Record<number, boolean> = {}
  for (const id of ids) {
    const anons = byPost.get(id) ?? []
    counts[id] = anons.length
    liked[id] = anonId ? anons.includes(anonId) : false
  }

  return { counts, liked }
}
