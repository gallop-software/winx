'use client'

import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { Image } from '@/components/image'

export interface VideoBackgroundProps {
  /** Vimeo video ID */
  videoId: string
  /** Vimeo hash for private/unlisted videos */
  videoHash?: string
  /** Poster image to show while video loads */
  posterImage?: string
  /** Gradient overlay classes */
  gradientOverlay?: string
  /** Additional className for the container */
  className?: string
}

export function VideoBackground({
  videoId,
  videoHash,
  posterImage,
  gradientOverlay = 'bg-gradient-to-br from-purple-900/40 via-overlay/60 to-overlay/80',
  className,
}: VideoBackgroundProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const hashParam = videoHash ? `&h=${videoHash}` : ''
  const vimeoSrc = `https://player.vimeo.com/video/${videoId}?autoplay=1&loop=1&muted=1&background=1&quality=1080p${hashParam}`

  return (
    <>
      {/* Background poster image - stays visible underneath (z-0) */}
      {posterImage && (
        <div className="absolute inset-0 w-full h-full z-0">
          <Image
            src={posterImage}
            alt=""
            size="full"
            rounded="rounded-none"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Background video - fades in on top of poster (z-[1]) */}
      <div
        className={clsx(
          'absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-1000 z-[1]',
          videoLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
      >
        {isMounted && (
          <iframe
            src={vimeoSrc}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto"
            style={{ aspectRatio: '16/9' }}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            title="Background Video"
            onLoad={() => setVideoLoaded(true)}
          ></iframe>
        )}
      </div>

      {/* Background gradient overlay (z-10) */}
      {gradientOverlay && (
        <div className={clsx('absolute inset-0 z-10', gradientOverlay)}></div>
      )}
    </>
  )
}
