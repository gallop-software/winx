'use client'

import { useRef } from 'react'

interface VimeoPlayerProps {
  embed: any
}

/**
 * Extracts aspect ratio padding percentage from a className string
 * Looks for patterns like "aspect-ratio-16-9" or "aspect-16-9"
 * Returns padding-top percentage (e.g., "56.25%" for 16:9)
 */
function getAspectRatioPadding(className?: string): string | undefined {
  if (!className) return undefined

  // Common aspect ratio patterns and their padding percentages
  const aspectRatios: Record<string, string> = {
    '16-9': '56.25%',
    '16/9': '56.25%',
    '4-3': '75%',
    '4/3': '75%',
    '1-1': '100%',
    '1/1': '100%',
    '21-9': '42.86%',
    '21/9': '42.86%',
    '9-16': '177.78%',
    '9/16': '177.78%',
  }

  // Try to match aspect ratio patterns in className
  const match = className.match(/aspect[-_]?(?:ratio[-_]?)?(\d+)[-_/](\d+)/i)
  if (match) {
    const [, width = '16', height = '9'] = match
    const key = `${width}-${height}`
    if (aspectRatios[key]) {
      return aspectRatios[key]
    }
    // Calculate custom aspect ratio
    return `${(parseInt(height) / parseInt(width)) * 100}%`
  }

  return undefined
}

export function VimeoPlayer({ embed }: VimeoPlayerProps) {
  const playerRef = useRef<HTMLIFrameElement>(null)

  const iframe = embed?.wpBlockEmbedWrapper?.iframe || undefined
  const aspectRatio = getAspectRatioPadding(embed?._className)
  const vimeoSrc = iframe?._src
    ? `${iframe._src}${
        iframe._src.includes('?') ? '&' : '?'
      }muted=0&autoplay=1&loop=0&autopause=1`
    : undefined

  return (
    <div
      className="relative w-full mx-auto max-w-6xl"
      style={{
        paddingTop: aspectRatio ? aspectRatio : '56.25%',
      }}
    >
      <iframe
        ref={playerRef}
        src={vimeoSrc}
        width={iframe?._width}
        height={iframe?._height}
        title={iframe?._title}
        frameBorder={0}
        className="rounded-md absolute inset-0 w-full h-full"
        allow="autoplay; fullscreen"
      />
    </div>
  )
}
