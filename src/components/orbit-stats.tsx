'use client'

import clsx from 'clsx'
import { useInView } from 'react-intersection-observer'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { Icon } from '@/components/icon'
import { CountUp } from '@/components/count-up'

interface OrbitStatsProps {
  /** The stat number to display */
  stat: number
  /** Suffix for the stat (e.g., "+", "M+") */
  suffix?: string
  /** Label text below the stat */
  label: string
  /** Iconify icon object */
  icon: { body: string; width?: number; height?: number }
  /** Color configuration */
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  /** Additional className for the container */
  className?: string
}

export function OrbitStats({
  stat,
  suffix = '+',
  label,
  icon,
  colors,
  className = '',
}: OrbitStatsProps) {
  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: false,
  })

  return (
    <div
      ref={ref}
      className={clsx('relative w-full', className)}
    >
      {/* Circular design */}
      <div className="relative aspect-square">
        {/* Outer ring with orbiting dot */}
        <div
          className="absolute inset-0 rounded-full border-2 animate-spin-slow"
          style={{
            borderColor: `${colors.secondary}33`,
            animationPlayState: inView ? 'running' : 'paused',
          }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{ backgroundColor: colors.secondary }}
          ></div>
        </div>

        {/* Middle ring with orbiting dot */}
        <div
          className="absolute inset-8 rounded-full border-2 animate-spin-medium-reverse"
          style={{
            borderColor: `${colors.primary}33`,
            animationPlayState: inView ? 'running' : 'paused',
          }}
        >
          <div
            className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-70"
            style={{ backgroundColor: colors.accent }}
          ></div>
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full"
            style={{ backgroundColor: colors.primary }}
          ></div>
        </div>

        {/* Inner circle */}
        <div
          className="absolute inset-16 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(to bottom right, ${colors.primary}33, ${colors.secondary}33)`,
          }}
        >
          <div className="text-center p-8">
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.secondary})`,
              }}
            >
              <Icon
                icon={icon}
                className="w-10 h-10 text-overlay-text"
              />
            </div>
            <Heading
              as="h3"
              margin="mb-2"
              fontSize="text-2xl"
            >
              <CountUp
                end={stat}
                suffix={suffix}
                delay={0}
                duration={3}
              />
            </Heading>
            <Label margin="mb-0">{label}</Label>
          </div>
        </div>
      </div>
    </div>
  )
}
