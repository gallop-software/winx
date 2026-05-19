import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'

export default function Hero() {
  return (
    <Section className="bg-body2 pt-7 pb-0">
      <div className="max-w-3xl">
        <Heading as="h1" margin="mb-4">
          About Founder Notes
        </Heading>
        <Heading as="h2" margin="mb-0">
          An independent publication for the people building today&rsquo;s
          companies.
        </Heading>
        <Paragraph margin="mt-4 mb-0">
          Each week, Founder Notes publishes a single, carefully considered
          essay on product strategy, fundraising, hiring, and the practical
          realities of building an early-stage company. No social threads, no
          promotional content, and no sponsored commentary.
        </Paragraph>
      </div>
    </Section>
  )
}
