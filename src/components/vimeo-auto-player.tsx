'use client'

import Player from '@vimeo/player'
import { clsx } from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { state, useSnapshot } from '@/state'

type VimeoAutoPlayerProps = {
  videoId: string
  className?: string
  id?: string
  aspectRatio?: string // e.g., "16/9", "4/3", "21/9"
  width?: number
  height?: number
  autoplay?: boolean // Control autoplay behavior
  muted?: boolean // Control whether video is muted
  controls?: boolean // Show/hide player controls (default: true)
}

export function VimeoAutoPlayer({
  videoId,
  className,
  id,
  aspectRatio = '16/9',
  width,
  height,
  autoplay = true,
  muted: mutedProp,
  controls = true,
}: VimeoAutoPlayerProps) {
  const snap = useSnapshot(state)
  const muted = mutedProp === true ? true : !snap.playVideo // If mutedProp is true, always mute, otherwise use state
  const { ref, inView } = useInView({ triggerOnce: false, threshold: 0.85 })
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<Player | null>(null)
  const [mounted, setMounted] = useState(false)

  // Always start with muted=0 in URL, control volume via API
  const src = `https://player.vimeo.com/video/${videoId}?muted=0&loop=1&byline=0&title=0&controls=${controls ? 1 : 0}&autoplay=1`

  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize player
  useEffect(() => {
    if (!mounted) return
    if (iframeRef.current && !playerRef.current) {
      playerRef.current = new Player(iframeRef.current)

      // Set initial volume based on muted prop
      playerRef.current.ready().then(() => {
        if (playerRef.current) {
          playerRef.current.setVolume(muted ? 0 : 1)
        }
      })
    }
  }, [mounted, muted])

  // Update volume when muted state changes
  useEffect(() => {
    if (!mounted || !playerRef.current) return

    playerRef.current.ready().then(() => {
      if (playerRef.current) {
        playerRef.current.setVolume(muted ? 0 : 1)
      }
    })
  }, [muted, mounted])

  // Handle play/pause based on visibility
  useEffect(() => {
    if (!mounted || !playerRef.current || !autoplay) return

    if (inView) {
      // Try to play with sound first, fallback to muted if blocked
      if (!muted) {
        playerRef.current
          .setVolume(1)
          .then(() => {
            return playerRef.current!.play()
          })
          .catch((error) => {
            console.warn('Autoplay with sound blocked, trying muted:', error)
            // If autoplay with sound fails, try muted
            playerRef
              .current!.setVolume(0)
              .then(() => {
                return playerRef.current!.play()
              })
              .catch((mutedError) => {
                console.warn('Muted autoplay also failed:', mutedError)
              })
          })
      } else {
        playerRef.current.play().catch(() => {})
      }
    } else {
      playerRef.current.pause().catch(() => {})
    }
  }, [inView, mounted, muted, autoplay])

  // Calculate aspect ratio values
  const getAspectRatioValues = () => {
    if (width && height) {
      return { width, height }
    }

    // Parse aspect ratio string (e.g., "16/9")
    const [w, h] = aspectRatio.split('/').map(Number)
    return { width: w || 16, height: h || 9 }
  }

  const { width: aspectWidth, height: aspectHeight } = getAspectRatioValues()

  return (
    <div
      {...(id ? { id } : {})}
      ref={ref}
      className={clsx(
        className,
        'relative aspect-[--width/--height] [--radius:var(--radius-xl)]'
      )}
      style={
        {
          aspectRatio: `${aspectWidth} / ${aspectHeight}`,
          '--width': aspectWidth,
          '--height': aspectHeight,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 h-full w-full overflow-hidden rounded-(--radius) shadow-2xl ring-1 ring-contrast-dark/10">
        {mounted && (
          <iframe
            ref={iframeRef}
            src={src}
            className="block h-full w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Vimeo Video Player"
          />
        )}
      </div>
    </div>
  )
}
