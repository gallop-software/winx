import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Label } from '@/components/label'
import { Button } from '@/components/button'

export default function Expertise() {
  return (
    <Section className="bg-body py-10">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl ring-1 ring-accent5 shadow-sm bg-body p-10 sm:p-12">
          <Label margin="mb-4">About the publication</Label>
          <Heading as="h2" margin="mb-6">
            Substantive writing for people building companies.
          </Heading>
          <Paragraph margin="mb-8">
            Founder Notes exists because most startup writing is either too
            abstract to be useful or too tactical to be true. The essays here
            sit in the middle — grounded in operating reality, paced like a
            Sunday read, and written for the people doing the actual work of
            building companies. Each week, one carefully written piece on
            product, fundraising, hiring, go-to-market, or the quieter parts
            of leadership that rarely make it onto a conference stage.
          </Paragraph>
          <Button href="#favorite-articles">Featured founder essays</Button>
        </div>
      </div>
    </Section>
  )
}
