import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'

export default function Hero() {
  return (
    <Section className="bg-body2 pt-7 pb-0">
      <div className="max-w-3xl">
        <Heading as="h1" margin="mb-4">
          Contact
        </Heading>
        <Heading as="h2" margin="mb-0">
          Questions, feedback, or just want to say hello?
        </Heading>
        <Paragraph margin="mt-6 mb-0">
          Send a note and we&rsquo;ll get back to you. We read every message.
        </Paragraph>
      </div>
    </Section>
  )
}
