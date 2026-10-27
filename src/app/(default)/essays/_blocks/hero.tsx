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
          All Essays
        </Heading>
        <Paragraph margin="mb-5">
          Every essay on product, fundraising, hiring, and building a startup,
          by month and by category.
        </Paragraph>
      </div>
    </Section>
  )
}
