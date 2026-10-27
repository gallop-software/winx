// The form a post's path is stored in and looked up by: no trailing slash, and
// characters outside ASCII percent-encoded in lower case, as WordPress writes
// them (/2009/07/l%e2%80%99elisir-d%e2%80%99amore-in-santa-fe). A path arrives
// encoded from WordPress and may arrive decoded from the router, so both are
// brought to the same form.
export function normalizePostUrl(path: string): string {
  const bare = (path.split(/[?#]/)[0] ?? '').replace(/\/+$/, '')
  let decoded = bare
  try {
    decoded = decodeURI(bare)
  } catch {
    // Not valid percent-encoding: use the path as given.
  }
  return encodeURI(decoded).toLowerCase()
}

// The parts of a post path, or null when the path is not a post's.
export function parsePostUrl(
  path: string
): { year: string; month: string; slug: string } | null {
  const match = normalizePostUrl(path).match(/^\/(\d{4})\/(\d{2})\/([^/]+)$/)
  if (!match) return null
  return { year: match[1]!, month: match[2]!, slug: match[3]! }
}

export function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

// A slug in the form WordPress stores it, whether it arrived encoded or not.
export function normalizeSlug(slug: string): string {
  return encodeURIComponent(decodeSlug(slug)).toLowerCase()
}
