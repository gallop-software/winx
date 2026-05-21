import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'

export default function Hero() {
  return (
    <Section className="bg-body pt-7">
      <div className="max-w-3xl">
        <Label margin="mb-2">Get in touch</Label>
        <Heading
          as="h1"
          margin="mb-5"
        >
          Contact
        </Heading>
      </div>
    </Section>
  )
}
