import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'

export default function Hero() {
  return (
    <Section className="pt-7">
      <div className="max-w-3xl">
        <Label margin="mb-2">About</Label>
        <Heading
          as="h1"
          margin="mb-10"
        >
          About Founder Notes
        </Heading>
      </div>
    </Section>
  )
}
