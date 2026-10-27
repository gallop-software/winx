// What an emailed link carries, read once from the address bar and then
// dropped from it, so the key does not stay in the browser's history or
// travel in a Referer header.
function takeParams<Name extends string>(names: readonly Name[]): Record<Name, string> {
  const found = Object.fromEntries(names.map((name) => [name, ''])) as Record<Name, string>
  if (typeof window === 'undefined') return found

  const params = new URLSearchParams(window.location.search)
  for (const name of names) found[name] = params.get(name) ?? ''
  if (names.some((name) => found[name])) {
    window.history.replaceState(null, '', window.location.pathname)
  }
  return found
}

// The id and key of a link WordPress emailed.
export function takeLinkParams(): { id: string; key: string } {
  return takeParams(['id', 'key'] as const)
}

export type ConfirmLink =
  // The site's own sign-up link: the address, the names, when, the signature.
  | { kind: 'signup'; e: string; f: string; l: string; t: string; s: string }
  // WordPress's, for a member who changed their address.
  | { kind: 'existing'; id: string; key: string }
  | { kind: 'none' }

// Whichever link the confirmation page was opened with.
export function takeConfirmLink(): ConfirmLink {
  const { id, key, e, f, l, t, s } = takeParams(['id', 'key', 'e', 'f', 'l', 't', 's'] as const)
  if (s && e && t) return { kind: 'signup', e, f, l, t, s }
  if (id && key) return { kind: 'existing', id, key }
  return { kind: 'none' }
}
