import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { Blog } from '@/components/blog'

export default function Archive() {
  return (
    <Section
      className="bg-body py-10"
      id="favorite-articles"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-baseline justify-between">
          <div>
            <Label margin="mb-2">Latest essays</Label>
            <Heading
              as="h1"
              margin="mb-10"
            >
              New writing from Founder Notes
            </Heading>
          </div>
        </div>
        <Blog />
      </div>
    </Section>
  )
}
