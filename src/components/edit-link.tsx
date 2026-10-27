'use client'

import { useEffect } from 'react'
import { state } from '@/state'

interface EditLinkProps {
  meta: {
    databaseId: number
    slug: string
    postType: string
    wpUrl?: string
  }
}

// Tells the admin bar which WordPress post this page shows, so its Edit in
// WordPress button opens that post. Renders nothing itself: the buttons are
// in src/components/admin-bar.tsx.
export default function EditLink({ meta }: EditLinkProps) {
  const { databaseId, wpUrl } = meta

  useEffect(() => {
    if (databaseId === 0 || !wpUrl) return
    state.editTarget = { databaseId, wpUrl }
    return () => {
      state.editTarget = null
    }
  }, [databaseId, wpUrl])

  return null
}
