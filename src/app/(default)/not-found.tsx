import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Label } from '@/components/label'
import { Button } from '@/components/button'

export default function NotFound() {
  return (
    <Section className="bg-body pt-7">
      <div className="max-w-3xl">
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
