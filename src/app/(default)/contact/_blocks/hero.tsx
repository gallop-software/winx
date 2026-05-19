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
          For inquiries, feedback, and correspondence.
        </Heading>
        <Paragraph margin="mt-4 mb-0">
          Use the form below to get in touch. Every message is read personally,
          and we aim to respond within a few business days.
        </Paragraph>
      </div>
    </Section>
  )
}
