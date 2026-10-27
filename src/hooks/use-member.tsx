'use client'

import { useCallback, useEffect } from 'react'
import { state, useSnapshot } from '@/state'
import type { Member } from '@/utils/member-types'

// Who is logged in. Asked of the site once per page load, from the session
// cookie alone; every component that needs it shares the answer through
// the store.

let loading: Promise<void> | null = null

async function load(): Promise<void> {
  try {
    const response = await fetch('/api/account/me/', { cache: 'no-store' })
    const data = (await response.json()) as { member?: Member | null }
    state.member = data.member ?? null
  } catch {
    state.member = null
  } finally {
    state.memberLoaded = true
  }
}

export function useMember() {
  const snap = useSnapshot(state)

  useEffect(() => {
    if (!state.memberLoaded && !loading) loading = load()
  }, [])

  const refresh = useCallback(async () => {
    loading = load()
    await loading
  }, [])

  const logOut = useCallback(async () => {
    state.member = null
    await fetch('/api/account/logout/', { method: 'POST' }).catch(() => {})
  }, [])

  const openLogin = useCallback(() => {
    state.loginOpen = true
  }, [])

  return {
    member: snap.member,
    loaded: snap.memberLoaded,
    refresh,
    logOut,
    openLogin,
  }
}
