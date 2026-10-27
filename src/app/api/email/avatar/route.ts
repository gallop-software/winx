import type { NextRequest } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { studioUrl } from '@/utils/studio-helpers'

export const dynamic = 'force-dynamic'

// The editor's photo as a square, for the round pictures in a mailing. Mail
// programs cannot crop an image into a circle themselves (Gmail ignores
// object-fit), and the photo is wider than it is tall, so it would be
// squeezed. Cut here once by Cloudflare Images, centred on the face, and
// kept in the edge cache.

const SOURCE = '/headshot.jpg'
// Twice the size it is shown at, for sharp screens.
const SIZES = new Set([96, 128])

type Images = {
  input(stream: ReadableStream<Uint8Array>): {
    transform(options: Record<string, unknown>): {
      output(options: { format: 'image/jpeg'; quality: number }): Promise<{
        response(): Response
      }>
    }
  }
}

export async function GET(req: NextRequest) {
  const size = Number(req.nextUrl.searchParams.get('size'))
  const source = studioUrl(SOURCE, 'medium')
  if (!SIZES.has(size)) return Response.redirect(source, 302)

  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default
  const key = new Request(`${req.nextUrl.origin}/api/email/avatar/?size=${size}`)
  const cached = await cache?.match(key)
  if (cached) return cached

  try {
    const { env } = getCloudflareContext()
    const images = (env as unknown as { IMAGES?: Images }).IMAGES
    const original = await fetch(source)
    if (!images || !original.ok || !original.body) return Response.redirect(source, 302)

    const result = await images
      .input(original.body)
      .transform({ width: size, height: size, fit: 'cover', gravity: 'face' })
      .output({ format: 'image/jpeg', quality: 85 })
    const image = result.response()
    const response = new Response(image.body, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=2592000',
      },
    })
    await cache?.put(key, response.clone())
    return response
  } catch (error) {
    console.error('The avatar could not be made:', error)
    return Response.redirect(source, 302)
  }
}
