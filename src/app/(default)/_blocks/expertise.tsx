import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Button } from '@/components/button'

export default function Expertise() {
  return (
    <Section className="bg-body2 py-20">
      <div className="max-w-4xl mx-auto">
        <Heading
          as="h2"
          textAlign="text-center"
          margin="mb-10"
        >
          About the publication
        </Heading>
        <Paragraph textAlign="text-left">
          Founder Notes exists because most startup writing is either too
          abstract to be useful or too tactical to be true. The essays here sit
          in the middle — grounded in operating reality, paced like a Sunday
          read, and written for the people doing the actual work of building
          companies. Each week, one carefully written piece on product,
          fundraising, hiring, go-to-market, or the quieter parts of leadership
          that rarely make it onto a conference stage.
        </Paragraph>
        <div className="mt-10">
          <Button
            href="#favorite-articles"
            className="w-full"
          >
            Featured founder essays
          </Button>
        </div>
      </div>
    </Section>
  )
}
