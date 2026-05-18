import { Heading } from '@/components/heading'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

export interface PageHeaderProps {
  /** Page title content */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
}

export function PageHeader({ children, className = '' }: PageHeaderProps) {
  return (
    <div className={clsx(className)}>
      <div className="container text-center mx-auto px-6 lg:px-8 pb-8 max-w-7xl">
        <Heading as="h1">{children}</Heading>
      </div>
    </div>
  )
}
