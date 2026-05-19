import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Label } from '@/components/label'
import { Button } from '@/components/button'
import arrowDownIcon from '@iconify/icons-heroicons/arrow-down'

export default function Intro() {
  return (
    <Section className="bg-body py-10">
      <div className="max-w-3xl mx-auto text-center">
        <Label margin="mb-5" textAlign="text-center">
          Founder Notes
        </Label>
        <Heading as="h1" textAlign="text-center" margin="mb-5">
          Building a company is the hardest thing you&rsquo;ll ever do clearly.
        </Heading>
        <Heading as="h2" textAlign="text-center" margin="mb-8">
          Essays for founders on the work that actually matters.
        </Heading>
        <Paragraph textAlign="text-center" margin="mb-10">
          Founder Notes is a weekly publication on product strategy,
          fundraising, hiring, and the day-to-day work of building an
          early-stage company. Long enough to think clearly, specific enough to
          act on, and written from the perspective of someone who has actually
          shipped product, raised capital, and figured out what to do next.
        </Paragraph>
        <Button
          href="#favorite-articles"
          icon={arrowDownIcon}
          iconPlacement="after"
        >
          Read the Latest Essays
        </Button>
      </div>
    </Section>
  )
}
