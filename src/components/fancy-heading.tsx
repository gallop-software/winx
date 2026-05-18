import { Heading } from '@/components/heading'
import { Accent } from '@/components/accent'
import clsx from 'clsx'

interface FancyHeadingProps {
  text: string
  accent: string
  className?: string
  id?: string
  as?: 'h1' | 'h2'
  margin?: string
}

// Helper function to generate a valid ID from text
function generateId(text: string, accent: string): string {
  const combined = `${text} ${accent}`
  const processed = combined
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

  return processed || 'heading' // Fallback if empty
}

export function FancyHeading({
  text,
  accent,
  className,
  id,
  as = 'h2',
  margin = 'mb-16',
}: FancyHeadingProps) {
  const generatedId = id || generateId(text, accent)

  return (
    <div className={clsx('text-center', margin, className)}>
      <Heading
        as={as}
        styleAs="h2"
        margin="mb-0"
        id={generatedId}
      >
        <span className="lg:pr-[25%] block">{text}</span>{' '}
        <Accent
          className="lg:pl-[15%] lg:-mt-6"
          color="text-contrast-dark"
          fontSize="text-5xl sm:text-6xl lg:text-6xl"
        >
          {accent}
        </Accent>
      </Heading>
    </div>
  )
}
