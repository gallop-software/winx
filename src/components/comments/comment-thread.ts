import type { SiteComment } from '@/utils/comment-types'

export type ThreadNode = {
  comment: SiteComment
  // 1 for a comment on the post itself, 2 for a reply to one, and so on.
  depth: number
  // Whose comment this answers, when that is not clear from where it sits.
  replyingTo: string | null
  replies: ThreadNode[]
}

// Indenting stops here however deep the replies go, so that the text of a
// long exchange still has room on a phone.
export const MAX_INDENT = 4

// Arranges a flat list of comments into threads, oldest first at every level.
//
// A reply whose parent is not in the list is shown as a comment on the post:
// the parent may have been removed, or cut from a very long list.
export function buildThread(comments: readonly SiteComment[]): ThreadNode[] {
  const byId = new Map<number, SiteComment>()
  for (const comment of comments) byId.set(comment.id, comment)

  const children = new Map<number, SiteComment[]>()
  for (const comment of comments) {
    const parent =
      comment.parent !== comment.id && byId.has(comment.parent)
        ? comment.parent
        : 0
    const siblings = children.get(parent) ?? []
    siblings.push(comment)
    children.set(parent, siblings)
  }

  const inOrder = (a: SiteComment, b: SiteComment) =>
    a.dateGmt.localeCompare(b.dateGmt) || a.id - b.id

  // Stored parents are not guaranteed to form a tree.
  const placed = new Set<number>()

  const build = (parent: number, depth: number): ThreadNode[] => {
    const nodes: ThreadNode[] = []
    for (const comment of (children.get(parent) ?? []).sort(inOrder)) {
      if (placed.has(comment.id)) continue
      placed.add(comment.id)
      nodes.push({
        comment,
        depth,
        replyingTo:
          depth > MAX_INDENT
            ? (byId.get(comment.parent)?.authorName ?? null)
            : null,
        replies: build(comment.id, depth + 1),
      })
    }
    return nodes
  }

  const threads = build(0, 1)

  // Whatever is left was only reachable through a loop.
  for (const comment of [...comments].sort(inOrder)) {
    if (placed.has(comment.id)) continue
    placed.add(comment.id)
    threads.push({ comment, depth: 1, replyingTo: null, replies: [] })
  }

  return threads
}
