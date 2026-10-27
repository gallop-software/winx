import 'server-only'

// Keys and signatures for what the site hands out and later has to
// recognise as its own: comment tokens, and members' session cookies.
//
// Nothing here needs a secret of its own. Every key is derived from the
// WordPress API key, which the site has to have anyway, with a salt and a
// purpose of its own, so nothing signed for one purpose can be presented as
// another, and the API key itself never signs anything.

const encoder = new TextEncoder()

const keys = new Map<string, { secret: string; key: CryptoKey }>()

export async function deriveHmacKey(
  secret: string,
  salt: string,
  purpose: string
): Promise<CryptoKey> {
  const name = `${salt}/${purpose}`
  const cached = keys.get(name)
  if (cached && cached.secret === secret) return cached.key

  const master = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'HKDF',
    false,
    ['deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode(salt),
      info: encoder.encode(purpose),
    },
    master,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign', 'verify']
  )

  keys.set(name, { secret, key })
  return key
}

export function toBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
    const bytes = new Uint8Array(new ArrayBuffer(binary.length))
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

// A SHA-256 signature is 32 bytes, which is 43 characters.
export function signatureBytes(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return null
  return fromBase64Url(value)
}

export async function signText(key: CryptoKey, text: string): Promise<string> {
  return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(text)))
}

// verify() compares in constant time, in Workers and in Node alike.
export async function verifyText(
  key: CryptoKey,
  text: string,
  signature: string
): Promise<boolean> {
  const bytes = signatureBytes(signature)
  if (!bytes) return false
  return crypto.subtle.verify('HMAC', key, bytes, encoder.encode(text))
}
