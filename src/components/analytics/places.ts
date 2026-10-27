// A country's name from its two letters, in the reader's own language.
export function countryName(code: string): string {
  if (!code) return ''
  try {
    return new Intl.DisplayNames(undefined, { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

// A country's flag from its two letters, as the emoji for it. Where a system
// has no flag emoji (Windows), the two letters show instead.
export function flagOf(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return ''
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65)
  )
}
