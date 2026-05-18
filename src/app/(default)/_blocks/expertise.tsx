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
          Douglas Newby Expertise
        </Heading>
        <Paragraph textAlign="text-left">
          A life long curiosity and interest in art, culture and economics, and
          how they impact homes, neighborhoods and cities shape the prescient
          understanding Douglas Newby has for evolving real estate markets. His
          uncanny ability to see which homes and neighborhoods thrive and which
          will lag and when has been immensely beneficial to his clients and to
          the city. Ultimately, what is most important is homes that make us
          happy.
        </Paragraph>
        <div className="mt-10">
          <Button
            href="#favorite-articles"
            className="w-full"
          >
            Featured Douglas Newby Blog Articles
          </Button>
        </div>
      </div>
    </Section>
  )
}
