'use client'

import { useEffect } from 'react'
import { state, useSnapshot } from '@/state'

// One request for the whole page, however many components ask.
let request: Promise<void> | null = null

function loadCategories() {
  if (state.categories || request) return
  request = fetch('/api/categories/')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .then((json) => {
      state.categories = Array.isArray(json?.categories) ? json.categories : []
    })
    .catch((error) => {
      console.error('Categories failed to load', error)
      // Let the next component that mounts try again.
      request = null
    })
}

export function useCategories() {
  const { categories } = useSnapshot(state)

  useEffect(() => {
    loadCategories()
  }, [])

  return categories ?? []
}
