import React from 'react'
import { clsx } from 'clsx'
import { Container } from '@/components/container'
import { Image } from '@/components/image'

interface SectionProps {
  children: React.ReactNode
  className?: string
  innerAlign?: 'wide' | 'content' | 'none' | 'full' | 'navbar'
  imageSrc?: string
  imageAlt?: string
  imageClassName?: string
  overlayColor?: string
  id?: string
}

export function Section({
  children,
  className,
  innerAlign,
  imageSrc,
  imageAlt,
  imageClassName,
  overlayColor,
  id,
}: SectionProps) {
  return (
    <section
      id={id}
      className={clsx('relative [&>*>*>*:last-child]:mb-0', className)}
    >
      {imageSrc && (
        <>
          <Image
            src={imageSrc}
            size="full"
            alt={imageAlt || ''}
            rounded="rounded-none"
            className={clsx(
              'object-cover object-center absolute inset-0 w-full h-full -z-[2]',
              imageClassName
            )}
          />
          <div
            className={clsx(
              'absolute inset-0 -z-[1]',
              overlayColor || 'bg-overlay/30'
            )}
          ></div>
        </>
      )}
      <Container {...(innerAlign && { align: innerAlign })}>
        {children}
      </Container>
    </section>
  )
}
