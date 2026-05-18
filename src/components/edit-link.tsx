'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Paragraph } from '@/components/paragraph'
import pencilSolidIcon from '@iconify/icons-heroicons/pencil-solid'
import eyeIcon from '@iconify/icons-heroicons/eye'
import arrowPath20Solid from '@iconify/icons-heroicons/arrow-path-20-solid'
import { Icon } from '@/components/icon'
import { state, useSnapshot } from '@/state'

interface EditLinkProps {
  meta: {
    databaseId: number
    slug: string
    postType: string
    wpUrl?: string
  }
}

export default function EditLink({ meta }: EditLinkProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const snap = useSnapshot(state)

  if (!snap.isLoggedIn) return null

  const { databaseId, slug, postType, wpUrl } = meta

  const handleRevalidate = async () => {
    const response = await fetch('/api/revalidate/', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ path: pathname }),
    })
    const data = await response.json()

    setDialogMessage(
      data.revalidated
        ? 'Page revalidated successfully!'
        : 'Failed to revalidate the page.'
    )
    setIsDialogOpen(true)
    setTimeout(() => {
      setIsDialogOpen(false)
      router.refresh()
    }, 500)
  }

  const buttonClass =
    'flex items-center justify-center w-12 h-12 rounded-full bg-accent text-accent-contrast shadow-lg hover:bg-accent-dark transition-colors cursor-pointer'

  return (
    <>
      <div className="flex flex-row gap-3 mt-8 lg:mt-0 lg:fixed lg:bottom-6 lg:left-6 lg:z-40">
        <button
          type="button"
          onClick={handleRevalidate}
          aria-label="Revalidate page"
          className={buttonClass}
        >
          <Icon className="w-6 h-6" icon={arrowPath20Solid} />
        </button>
        {databaseId !== 0 && wpUrl && (
          <>
            <a
              href={`${wpUrl}/${postType !== 'page' ? `${postType}/` : ''}${slug !== 'home' ? `${slug}/` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on WordPress"
              className={buttonClass}
            >
              <Icon className="w-6 h-6" icon={eyeIcon} />
            </a>
            <a
              href={`${wpUrl}/wp-admin/post.php?post=${databaseId}&action=edit`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Edit in WordPress"
              className={buttonClass}
            >
              <Icon className="w-6 h-6" icon={pencilSolidIcon} />
            </a>
          </>
        )}
      </div>
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-overlay/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-sm rounded bg-body p-6 shadow-lg">
            <DialogTitle as={Paragraph} margin="mb-0">
              {dialogMessage}
            </DialogTitle>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
