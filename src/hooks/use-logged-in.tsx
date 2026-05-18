'use client'

import { useEffect } from 'react'
import { state } from '@/state'

export function useLoggedIn() {
  useEffect(() => {
    const token = localStorage.getItem('wpToken')
    state.isLoggedIn = !!token
  }, [])
}
