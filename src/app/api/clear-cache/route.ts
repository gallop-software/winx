import { NextRequest, NextResponse } from 'next/server'
import { clearAllPosts, clearPagesNow } from '@/utils/post-cache'
import { requireAdmin } from '@/utils/admin-session'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  let response: NextResponse
  try {
    const cleared = await clearAllPosts()
    if (cleared) await clearPagesNow()
    response = NextResponse.json(
      cleared
        ? { cleared: true }
        : { cleared: false, message: 'No post cache configured' },
      { status: cleared ? 200 : 500 }
    )
  } catch (error) {
    response = NextResponse.json(
      { cleared: false, error: (error as Error).message },
      { status: 500 }
    )
  }

  return response
}
