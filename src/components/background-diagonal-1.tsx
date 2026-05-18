import { clsx } from 'clsx'

interface BackgroundDiagonal1Props {
  /** Gradient start color (Tailwind class or CSS variable) */
  gradientFrom?: string
  /** Gradient middle color (Tailwind class or CSS variable) */
  gradientVia?: string
  /** Gradient end color (Tailwind class or CSS variable) */
  gradientTo?: string
  /** First blur overlay color (Tailwind class) */
  blurColor1?: string
  /** Second blur overlay color (Tailwind class) */
  blurColor2?: string
  /** Dashed line stroke color (CSS variable) */
  lineColor?: string
  /** Pattern ID - override if using multiple on same page */
  patternId?: string
  /** Additional CSS classes */
  className?: string
}

export function BackgroundDiagonal1({
  gradientFrom = 'from-[var(--color-body2)]',
  gradientVia = 'via-[var(--color-accent3)]',
  gradientTo = 'to-[var(--color-accent3-dark)]',
  blurColor1 = 'from-accent5-dark',
  blurColor2 = 'bg-accent3-light',
  lineColor = 'var(--color-accent3-dark)',
  patternId = 'bg-diagonal-1',
  className,
}: BackgroundDiagonal1Props) {
  return (
    <>
      {/* Gradient mesh background with diagonal clip */}
      <div className={clsx('absolute inset-0 -z-10', className)}>
        {/* Main gradient with diagonal clip */}
        <div
          className={clsx(
            'absolute inset-0 bg-gradient-to-br clip-diagonal',
            gradientFrom,
            gradientVia,
            gradientTo
          )}
        />

        {/* Blur overlays for depth */}
        <div
          className={clsx(
            'absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br to-transparent opacity-40 blur-3xl clip-diagonal',
            blurColor1
          )}
        />
        <div
          className={clsx(
            'absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-30 blur-3xl clip-diagonal',
            blurColor2
          )}
        />
      </div>

      {/* Diagonal dashed lines overlay */}
      <svg
        className="absolute inset-0 -z-10 w-full h-full pointer-events-none opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width="50"
            height="50"
            patternTransform="rotate(-45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="50"
              stroke={lineColor}
              strokeWidth="1"
              strokeDasharray="6 12"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
        />
      </svg>
    </>
  )
}
