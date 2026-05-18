'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { studioUrl } from '@/utils/studio-helpers'

type VideoProps = {
  src: string
  className?: string
  loop?: boolean
  muted?: boolean
  playsInline?: boolean
  threshold?: number
  'aria-label'?: string
}

export function Video({
  src,
  className,
  loop = true,
  muted = true,
  playsInline = true,
  threshold = 0.25,
  'aria-label': ariaLabel,
}: VideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const { ref: inViewRef, inView } = useInView({ threshold })

  // Resolve src to CDN URL if available
  const resolvedSrc = studioUrl(src)

  const setRefs = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node
      inViewRef(node)
    },
    [inViewRef]
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (inView) {
      video.play()
    } else {
      video.pause()
    }
  }, [inView])

  return (
    <video
      ref={setRefs}
      src={resolvedSrc}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      className={className}
      aria-label={ariaLabel}
    />
  )
}
