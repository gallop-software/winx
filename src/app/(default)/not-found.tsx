import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Label } from '@/components/label'
import { Button } from '@/components/button'

export default function NotFound() {
  return (
    <Section className="bg-body py-10">
      <div className="max-w-2xl mx-auto text-center">
        <Label margin="mb-5" textAlign="text-center">
          404
        </Label>
        <Heading as="h1" textAlign="text-center" margin="mb-5">
          Page Not Found
        </Heading>
        <Paragraph textAlign="text-center" margin="mb-10">
          The page you were looking for has moved, been retired, or never
          existed in the first place. From here, the archive of essays is the
          best place to start.
        </Paragraph>
        <Button variant="outline" href="/" native>
          Return Home
        </Button>
      </div>
    </Section>
  )
}
