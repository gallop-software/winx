'use client'

import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Label } from '@/components/label'
import { Buttons } from '@/components/buttons'
import { Button } from '@/components/button'
import arrowPathIcon from '@iconify/icons-heroicons/arrow-path-20-solid'

/**
 * Shared error page body. Each error page owns its wrapper spacing and passes
 * it via className.
 */
export function ErrorContent({
  reset,
  className = '',
}: {
  reset: () => void
  className?: string
}) {
  return (
    <Section className={className}>
      <div className="max-w-3xl">
        <Label margin="mb-2">500</Label>
        <Heading
          as="h1"
          margin="mb-2"
        >
          Something Went Wrong
        </Heading>
        <Paragraph margin="mb-0">
          An unexpected error occurred. Try again, or head back to the archive
          of essays to keep reading.
        </Paragraph>
        <Buttons margin="mt-10">
          <Button
            onClick={reset}
            icon={arrowPathIcon}
            iconPlacement="after"
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            href="/"
            native
          >
            Return Home
          </Button>
        </Buttons>
      </div>
    </Section>
  )
}
