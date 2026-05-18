import { clsx } from 'clsx'

interface BackgroundWallpaper1Props {
  className?: string
}

export function BackgroundWallpaper1({ className }: BackgroundWallpaper1Props) {
  return (
    <svg
      className={clsx(
        'absolute inset-0 w-full h-full opacity-[0.04] z-0',
        className
      )}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="cross-pattern"
          width="60"
          height="60"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"
            fill="currentColor"
          />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="url(#cross-pattern)"
      />
    </svg>
  )
}
