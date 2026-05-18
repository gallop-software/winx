'use client'

import { useState } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import Script from 'next/script'
import clsx from 'clsx'
import xMarkIcon from '@iconify/icons-heroicons/x-mark-20-solid'
import { Icon } from '@/components/icon'
import { VimeoPlayer } from '@/components/vimeo-player'

function getVideoId(url?: string): string | undefined {
  if (!url) return undefined

  // YouTube: https://www.youtube.com/watch?v=VIDEO_ID
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
  )
  if (ytMatch) return `youtube-${ytMatch[1]}`

  // Vimeo: https://player.vimeo.com/video/VIDEO_ID
  const vimeoMatch = url.match(/vimeo\.com\/video\/(\d+)/)
  if (vimeoMatch) return `vimeo-${vimeoMatch[1]}`

  return undefined
}

export function VideoPopup({
  children,
  url = undefined,
  embed = undefined,
  className,
}: {
  children: React.ReactNode
  url?: string | undefined
  embed?: any
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const iframe = embed?.wpBlockEmbedWrapper?.iframe || undefined

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: iframe?._title,
    contentUrl: iframe?._src,
    embedUrl: url,
  }

  const videoId = getVideoId(iframe?._src)

  return (
    <>
      {videoId && (
        <Script
          id={videoId}
          type="application/ld+json"
        >
          {JSON.stringify(schema)}
        </Script>
      )}
      <a
        href={url || '#'}
        onClick={(event) => {
          event.preventDefault()
          setIsOpen(true)
        }}
        className={clsx(className, 'block')}
      >
        {children}
      </a>
      <Dialog
        transition
        as="div"
        unmount={true}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-50 duration-300 ease-in-out transition data-[closed]:opacity-0"
      >
        <DialogPanel className="fixed inset-0 flex items-center justify-center">
          <div
            onClick={() => setIsOpen(false)}
            className="bg-body/50 backdrop-blur-md transition-opacity opacity-100 fixed inset-0 shadow-lg w-full max-w-full z-10 flex items-center justify-center px-4 sm:px-14"
          >
            {embed && <VimeoPlayer embed={embed} />}
          </div>
          <button
            type="button"
            className="absolute z-20 top-0 right-0 rounded-none text-overlay-text focus:outline-none focus:ring-0 hover:bg-overlay-text/10 p-2"
            onClick={() => setIsOpen(false)}
          >
            <span className="sr-only">Close panel</span>
            <Icon
              icon={xMarkIcon}
              className="h-10 w-10 text-contrast"
            />
          </button>
        </DialogPanel>
      </Dialog>
    </>
  )
}
