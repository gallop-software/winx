import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/utils/admin-session'
import type { MemberSession } from '@/utils/member-session'
import { readJsonObject } from '@/utils/read-body'
import { WordPressBusyError } from '@/utils/wp-fetch'

// What every route under /api/mailing does the same way. Marketing email is
// an administrator's alone: the list of users carries every email address,
// and sending writes to all of them. So each route asks WordPress whether
// the person is still an administrator before it does anything.

const NO_STORE = { 'Cache-Control': 'no-store' }

export function reply(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } })
}

export function problem(message: string, status = 400) {
  return reply({ message }, status)
}

export async function adminRoute(
  req: NextRequest,
  work: (session: MemberSession) => Promise<NextResponse>
): Promise<NextResponse> {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  try {
    return await work(admin.session)
  } catch (error) {
    if (error instanceof WordPressBusyError) {
      return reply({ message: error.message, retryAfter: error.retryAfter }, 503, {
        'Retry-After': String(error.retryAfter),
      })
    }
    console.error('Mailing route failed:', error)
    return problem((error as Error).message || 'Something went wrong.', 500)
  }
}

// The JSON a route was sent, or a refusal.
export async function readInput(
  req: NextRequest,
  maxBytes = 16 * 1024
): Promise<Record<string, unknown> | NextResponse> {
  const input = await readJsonObject(req, maxBytes)
  if (input === 'too_large') return problem('That is too much to send at once.', 413)
  if (input === null) return problem('The request could not be read.')
  return input
}

export function positiveInteger(value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value
  return typeof number === 'number' && Number.isInteger(number) && number > 0 ? number : null
}
