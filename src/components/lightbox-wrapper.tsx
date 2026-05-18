'use client'

import clsx from 'clsx'
import { useRef } from 'react'
import { LightboxHandler } from '@/components/lightbox/lightbox-handler'

interface LightboxWrapperProps {
  children: React.ReactNode
  className?: string
}

export function LightboxWrapper({ children, className }: LightboxWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      className={clsx(className)}
    >
      {children}
      <LightboxHandler containerRef={containerRef} />
    </div>
  )
}
