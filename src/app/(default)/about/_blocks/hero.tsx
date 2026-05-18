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
          An independent publication for people building companies.
        </Heading>
        <Paragraph margin="mt-6 mb-0">
          One carefully written essay each week on product strategy,
          fundraising, hiring, and the day-to-day work of building an
          early-stage startup. No threads, no upsells, no sponsored takes.
        </Paragraph>
      </div>
    </Section>
  )
}
