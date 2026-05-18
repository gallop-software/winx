import { Section } from '@/components/section'
import { Heading } from '@/components/heading'

export default function Hero() {
  return (
    <Section className="bg-body2 pt-7 pb-0">
      <Heading
        as="h1"
        textAlign="text-left"
        margin="!mb-12"
      >
        All Essays &amp; Notes on Building Companies, Product Strategy,
        Fundraising, Hiring, and the Work of Being a Founder
      </Heading>
    </Section>
  )
}
