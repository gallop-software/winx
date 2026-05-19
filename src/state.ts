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
  likeCounts: {} as Record<string, number>,
  shareCounts: {} as Record<string, number>,
  liked: {} as Record<number, boolean>,
  pageBackButtonOutOfView: false,
})

export { state, useSnapshot, subscribe, proxy }
