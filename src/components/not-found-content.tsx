import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Label } from '@/components/label'
import { Button } from '@/components/button'

/**
 * Shared 404 page body. Each not-found page owns its wrapper spacing and
 * passes it via className. The marker tells the admin bar this is a page
 * that was not found, so an administrator gets Revalidate here and can bring
 * in a post or page WordPress has published since the last Sync.
 */
export function NotFoundContent({ className = '' }: { className?: string }) {
  return (
    <Section className={className}>
      <div
        className="max-w-3xl"
        data-not-found
      >
        <Label margin="mb-2">404</Label>
        <Heading
          as="h1"
          margin="mb-2"
        >
          Page Not Found
        </Heading>
        <Paragraph margin="mb-10">
          The page you were looking for has moved, been retired, or never
          existed in the first place. From here, the archive of essays is the
          best place to start.
        </Paragraph>
        <Button
          variant="outline"
          href="/"
          native
        >
          Return Home
        </Button>
      </div>
    </Section>
  )
}
