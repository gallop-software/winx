import 'server-only'
import { prisma } from '@/utils/prisma'
import { kv, likeCountKey, likesKey } from '@/utils/kv'

const TTL_SECONDS = 60 * 60 * 24 // 24h

// Clears the cached like count and likers set. Use after a like/unlike write.
export async function invalidateLike(id: number): Promise<void> {
  const p = kv.pipeline()
  p.del(likeCountKey(id))
  p.del(likesKey(id))
  await p.exec()
}

export async function getLikeCountFromDb(id: number): Promise<number> {
  return prisma.blogLike.count({ where: { post_id: id } })
}

export async function getLikeCount(id: number): Promise<number> {
  const cached = await kv.get<number | string>(likeCountKey(id))
  if (cached != null) return Number(cached)
  const total = await getLikeCountFromDb(id)
  await kv.set(likeCountKey(id), total, { ex: TTL_SECONDS })
  return total
}

// Cache-aside batch read. KV is checked first; any postId whose like_count is
// missing is rehydrated from Postgres in a single SQL query, then written back
// to KV (count + member set) for next time.
export async function getLikesBatch(
  ids: number[],
  anonId: string | null
): Promise<{
  counts: Record<number, number>
  liked: Record<number, boolean>
}> {
  if (ids.length === 0) return { counts: {}, liked: {} }

  const probe = kv.pipeline()
  for (const id of ids) probe.get<number | string>(likeCountKey(id))
  if (anonId) {
    for (const id of ids) probe.sismember(likesKey(id), anonId)
  }
  const probeResults = (await probe.exec()) as (number | string | null)[]

  const counts: Record<number, number> = {}
  const liked: Record<number, boolean> = {}
  const missing: number[] = []

  ids.forEach((id, i) => {
    const cached = probeResults[i]
    if (cached == null) {
      missing.push(id)
    } else {
      counts[id] = Number(cached)
      liked[id] = anonId ? Boolean(probeResults[ids.length + i]) : false
    }
  })

  if (missing.length > 0) {
    const rows = await prisma.blogLike.findMany({
      where: { post_id: { in: missing } },
      select: { post_id: true, anon_id: true },
    })

    const byPost = new Map<number, string[]>()
    for (const id of missing) byPost.set(id, [])
    for (const row of rows) byPost.get(row.post_id)?.push(row.anon_id)

    const writeP = kv.pipeline()
    for (const id of missing) {
      const anons = byPost.get(id) ?? []
      writeP.set(likeCountKey(id), anons.length, { ex: TTL_SECONDS })
      if (anons.length > 0) {
        writeP.sadd(likesKey(id), ...(anons as [string, ...string[]]))
        writeP.expire(likesKey(id), TTL_SECONDS)
      }
      counts[id] = anons.length
      liked[id] = anonId ? anons.includes(anonId) : false
    }
    await writeP.exec()
  }

  return { counts, liked }
}
