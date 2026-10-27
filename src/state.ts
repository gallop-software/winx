import { proxy, useSnapshot, subscribe } from 'valtio'
import type { Member } from '@/utils/member-types'

const state = proxy({
  playVideo: false,
  offsetTop: 0,
  windowHeight: 0,
  lastOffsetTop: 0,
  isScrolling: false,
  dialogOpen: false,
  scrollingDirection: 'down',
  lastScrollingDirection: 'down',
  lockScrollDirection: false,
  // Who is logged in, once /api/account/me has answered. null while not
  // yet known and when nobody is.
  member: null as Member | null,
  memberLoaded: false,
  loginOpen: false,
  likeCounts: {} as Record<string, number>,
  shareCounts: {} as Record<string, number>,
  commentCounts: {} as Record<number, number>,
  liked: {} as Record<number, boolean>,
  pageBackButtonOutOfView: false,
  categories: null as { name: string; slug: string; count: number }[] | null,
  editTarget: null as { databaseId: number; wpUrl: string } | null,
  // The admin toolbar's demo is on in this browser: the toolbar shows, with
  // made-up numbers and lists, for someone who is not an administrator.
  demo: false,
})

export { state, useSnapshot, subscribe, proxy }
