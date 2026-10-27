// Reads a request body, giving up as soon as it is longer than allowed
// rather than reading it all and then refusing. Used by every route that
// takes what a visitor typed.
export async function readBody(
  req: Request,
  maxBytes: number
): Promise<string | 'too_large' | null> {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) return 'too_large'

  const reader = req.body?.getReader()
  if (!reader) return null

  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel().catch(() => {})
      return 'too_large'
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

// The JSON object a route was sent, or null if it was not one.
export async function readJsonObject(
  req: Request,
  maxBytes: number
): Promise<Record<string, unknown> | 'too_large' | null> {
  const text = await readBody(req, maxBytes).catch(() => null)
  if (text === 'too_large') return 'too_large'
  try {
    const parsed: unknown = JSON.parse(text ?? '')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}
