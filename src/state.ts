import { proxy, useSnapshot, subscribe } from 'valtio'

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
  isLoggedIn: false,
  shareCounts: {} as Record<string, number>,
  likeCounts: {} as Record<number, number>,
  liked: {} as Record<number, boolean>,
  pageBackButtonOutOfView: false,
})

export { state, useSnapshot, subscribe, proxy }
