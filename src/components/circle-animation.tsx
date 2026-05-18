'use client'

import { useInView } from 'react-intersection-observer'
import clsx from 'clsx'

interface CircleAnimationProps {
  children: React.ReactNode
  className?: string
}

const CircleAnimation = ({ children, className }: CircleAnimationProps) => {
  const { ref, inView } = useInView({
    threshold: 0.01,
  })

  return (
    <div
      ref={ref}
      className={clsx(className, inView && 'animate-spin-slow-reverse')}
    >
      {children}
    </div>
  )
}

export default CircleAnimation
