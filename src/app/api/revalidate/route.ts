import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { DateTime } from 'luxon'
import { refreshComments } from '@/utils/comments'
import { syncPages, syncPostByUrl } from '@/utils/content-sync'
import { getPageByPath } from '@/utils/pages'
import {
  clearPagesAt,
  warmPages,
  refreshPost,
  refreshWordPressPage,
} from '@/utils/post-cache'
import { requireAdmin } from '@/utils/admin-session'

export const dynamic = 'force-dynamic'

async function revalidate(path: unknown, origin: string) {
  if (!path || typeof path !== 'string') {
    return NextResponse.json(
      { revalidated: false, message: 'No path provided' },
      { status: 400 }
    )
  }

  try {
    // A post is served from the post cache, so revalidating it means fetching
    // it from WordPress again, and bringing its entry in the content index up
    // to date with it. A post WordPress no longer has is removed from both.
    // A WordPress page likewise: the pages in the index are read again
    // first, so a page the index did not know yet (published since the last
    // Sync, which is why the administrator is on a 404) is found, and then
    // its body is fetched again. Other pages are either rendered on each
    // visit or only change on deploy; revalidatePath has nothing to clear for
    // them on Workers.
    const post = path.match(/^\/(\d{4})\/(\d{2})\/([^/]+)\/?$/)
    let page = null
    if (!post) {
      await syncPages()
      // getPageByPath is memoised for the request: looked up once, after
      // the sync.
      page = await getPageByPath(path)
    }
    // What WordPress no longer has is removed from the index above; the
    // cached pages still have to go, the lists it was on most of all, so a
    // removed post leaves the home page and the archives at once.
    const gone = async (message: string) => {
      revalidatePath(path)
      await clearPagesAt([path])
      await warmPages(origin, ['/'])
      return NextResponse.json({ revalidated: false, message }, { status: 404 })
    }
    if (page) {
      const data = await refreshWordPressPage(page.path)
      if (!data) return gone('Page not found in WordPress')
    }
    if (post) {
      const data = await refreshPost(post[3]!, post[1]!, post[2]!)
      await syncPostByUrl(path)

      // Its comments too, which are kept apart from the post. A failure here
      // is not a failure to revalidate the page.
      const postId = data?.post?.ID ?? data?.post?.id
      if (typeof postId === 'number') {
        await refreshComments(postId).catch((error) => {
          console.error('Comments refresh failed:', error)
        })
      }

      if (!data) return gone('Post not found in WordPress')
    }

    revalidatePath(path)
    // The page, and every list it is on, are built again on their next
    // visit; the page itself and the home page are built now, so the
    // refresh that follows is a hit.
    await clearPagesAt([path])
    await warmPages(origin, [path, '/'])
    return NextResponse.json({
      revalidated: true,
      now: DateTime.now().toMillis(),
    })
  } catch (error) {
    return NextResponse.json(
      { revalidated: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  const { path } = await req.json().catch(() => ({}))
  return revalidate(path, req.nextUrl.origin)
}
