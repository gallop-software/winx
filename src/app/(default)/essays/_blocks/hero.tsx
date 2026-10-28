import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { Paragraph } from '@/components/paragraph'

export default function Hero() {
  return (
    <Section className="bg-body pt-7">
      <div className="max-w-3xl">
        <Label margin="mb-2">The archive</Label>
        <Heading
          as="h1"
          margin="mb-2"
        >
          All Essays &amp; Notes
        </Heading>
        <Paragraph margin="mb-5">
          On building companies, product strategy, fundraising, hiring, and the
          work of being a founder.
        </Paragraph>
      </div>
    </Section>
  )
}
