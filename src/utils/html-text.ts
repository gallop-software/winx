const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
}

function fromCodePoint(code: number, original: string) {
  try {
    return String.fromCodePoint(code)
  } catch {
    // Not a valid code point: leave the entity as written.
    return original
  }
}

export function decodeEntities(input: string): string {
  if (!input) return input
  return input
    .replace(/&#x([0-9a-f]+);/gi, (m, hex: string) =>
      fromCodePoint(parseInt(hex, 16), m)
    )
    .replace(/&#(\d+);/g, (m, dec: string) =>
      fromCodePoint(parseInt(dec, 10), m)
    )
    .replace(
      /&([a-z]+);/gi,
      (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m
    )
}

// The readable text of an HTML fragment, for search. Tags become spaces so
// the words on either side of one stay separate.
export function htmlToText(html: string, maxLength?: number): string {
  if (!html) return ''
  const text = decodeEntities(
    html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]*>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()
  return maxLength && text.length > maxLength ? text.slice(0, maxLength) : text
}
