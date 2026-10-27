export interface Result {
  url: string
  title: string
  pageTitle?: string
  // The part of the page that matched, with the matched words between
  // MARK_START and MARK_END.
  content?: string
  isViewAll?: boolean
  [key: string]: any
}

export const MARK_START = '\u0002'
export const MARK_END = '\u0003'

// How long typing has to pause before the search is sent.
const DEBOUNCE_MS = 150

let latest: AbortController | null = null

// Searches the content index through /api/search. Each call cancels the one
// before it, so only what was typed last is answered; a cancelled call
// resolves to nothing.
export async function search(
  query: string,
  options: { limit?: number } = {}
): Promise<Result[]> {
  latest?.abort()
  const current = new AbortController()
  latest = current

  await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS))
  if (current.signal.aborted) return []

  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(options.limit ?? 20),
    })
    const response = await fetch(`/api/search/?${params}`, {
      signal: current.signal,
    })
    if (!response.ok) return []

    const json = await response.json()
    const results: { url: string; title: string; snippet: string }[] =
      Array.isArray(json?.results) ? json.results : []

    return results.map((r) => ({
      url: r.url,
      title: r.title,
      pageTitle: r.title,
      content: r.snippet,
    }))
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Search failed', error)
    }
    return []
  }
}
