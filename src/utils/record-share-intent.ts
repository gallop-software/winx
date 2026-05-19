import { state } from '@/state'

// Optimistically bumps shareCounts[slug] by 1, fires the POST, then reconciles
// with the server-returned count. Rolls back on failure.
export function recordShareIntent(slug: string, target: string): void {
  const prevCount = state.shareCounts[slug]
  state.shareCounts[slug] = (prevCount ?? 0) + 1
  fetch('/api/share-count', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, target }),
    keepalive: true,
  })
    .then((res) => res.json())
    .then((data) => {
      if (typeof data.count === 'number') {
        state.shareCounts[slug] = data.count
      }
    })
    .catch(() => {
      if (prevCount === undefined) {
        delete state.shareCounts[slug]
      } else {
        state.shareCounts[slug] = prevCount
      }
    })
}
