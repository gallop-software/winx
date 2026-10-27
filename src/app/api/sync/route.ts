import { NextRequest, NextResponse } from 'next/server'
import {
  finishRebuild,
  getSyncStatus,
  rebuildCounts,
  rebuildPage,
  rebuildTerms,
  startRebuild,
  syncChanged,
  syncPages,
  type RebuildKind,
  type SyncCursor,
} from '@/utils/content-sync'
import { WordPressBusyError } from '@/utils/wp-fetch'
import { clearPagesAt, clearPagesNow } from '@/utils/post-cache'
import { requireAdmin } from '@/utils/admin-session'

export const dynamic = 'force-dynamic'

const REBUILD_KINDS: RebuildKind[] = ['category', 'post_tag', 'author']

function readCursor(value: unknown): SyncCursor | null {
  if (!value || typeof value !== 'object') return null
  const { modifiedAfter, page } = value as Record<string, unknown>
  if (typeof modifiedAfter !== 'string' || typeof page !== 'number') return null
  if (!Number.isInteger(page) || page < 1) return null
  return { modifiedAfter, page }
}

function readPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null
}

async function run(body: Record<string, unknown>): Promise<NextResponse> {
  switch (body.action) {
    case 'sync': {
      const result = await syncChanged(readCursor(body.cursor))
      // The changed posts' pages and every list are rebuilt on their next
      // visit; the rest of the cache stays warm.
      if (result.updated.length) {
        await clearPagesAt(result.updated.map((p) => p.url))
      }
      return NextResponse.json(result)
    }

    case 'rebuild-start':
      return NextResponse.json(await startRebuild())

    case 'rebuild-page': {
      const runId = readPositiveInteger(body.runId)
      const page = readPositiveInteger(body.page)
      if (!runId || !page) break
      return NextResponse.json(await rebuildPage(runId, page))
    }

    case 'rebuild-terms': {
      const runId = readPositiveInteger(body.runId)
      const page = readPositiveInteger(body.page)
      const kind = REBUILD_KINDS.find((k) => k === body.kind)
      if (!runId || !page || !kind) break
      return NextResponse.json(await rebuildTerms(runId, kind, page))
    }

    case 'rebuild-pages':
      return NextResponse.json(await syncPages())

    case 'rebuild-counts': {
      const page = readPositiveInteger(body.page)
      if (!page) break
      return NextResponse.json(await rebuildCounts(page))
    }

    case 'rebuild-finish': {
      const runId = readPositiveInteger(body.runId)
      if (!runId) break
      const result = await finishRebuild(runId, body.force === true)
      if (result.finished) await clearPagesNow()
      return NextResponse.json(result)
    }
  }

  return NextResponse.json({ message: 'Unknown action' }, { status: 400 })
}

async function respond(
  req: NextRequest,
  work: () => Promise<NextResponse>
): Promise<NextResponse> {
  // Who may change the content index: an administrator logged in on the
  // site, confirmed with WordPress.
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  let response: NextResponse
  try {
    response = await work()
  } catch (error) {
    if (error instanceof WordPressBusyError) {
      response = NextResponse.json(
        { message: error.message, retryAfter: error.retryAfter },
        { status: 503, headers: { 'Retry-After': String(error.retryAfter) } }
      )
    } else {
      console.error('Content sync failed:', error)
      response = NextResponse.json(
        { message: (error as Error).message },
        { status: 500 }
      )
    }
  }

  return response
}

export async function GET(req: NextRequest) {
  return respond(req, async () => NextResponse.json(await getSyncStatus()))
}

export async function POST(req: NextRequest) {
  return respond(req, async () => {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'No action given' }, { status: 400 })
    }
    return run(body as Record<string, unknown>)
  })
}
