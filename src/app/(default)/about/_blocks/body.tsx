import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Button } from '@/components/button'

export default function Body() {
  return (
    <Section className="bg-body2 pt-10 pb-20">
      <div className="max-w-3xl space-y-10">
        <div>
          <Heading as="h3" margin="mb-4">
            Why this exists
          </Heading>
          <Paragraph margin="mb-4">
            Most startup writing is either too abstract to be useful or too
            tactical to be true. Founder Notes sits in the middle — long
            enough to think clearly, specific enough to act on, and written
            from the perspective of someone who has actually shipped product,
            raised capital, hired wrong, and figured out what to do next.
          </Paragraph>
          <Paragraph margin="mb-0">
            The goal isn&rsquo;t to sell a framework or a course. The goal is
            to help founders think more clearly about the decisions in front
            of them.
          </Paragraph>
        </div>

        <div>
          <Heading as="h3" margin="mb-4">
            What you&rsquo;ll find here
          </Heading>
          <Paragraph margin="mb-0">
            Long-form essays on product strategy, fundraising, hiring,
            go-to-market, leadership, and the quieter parts of company
            building that rarely make it onto a conference stage. One piece a
            week, delivered every Sunday — and a growing archive you can read
            in any order.
          </Paragraph>
        </div>

        <div>
          <Heading as="h3" margin="mb-4">
            Who it&rsquo;s for
          </Heading>
          <Paragraph margin="mb-0">
            If you&rsquo;re building something — pre-seed, post-PMF, or
            somewhere in the messy middle — this publication is for you. It
            is also written for the people who back, advise, and work
            alongside founders.
          </Paragraph>
        </div>

        <div>
          <Heading as="h3" margin="mb-4">
            How it&rsquo;s funded
          </Heading>
          <Paragraph margin="mb-0">
            Founder Notes is reader-supported. No sponsored posts, no paid
            placements, no display ads. Just the work.
          </Paragraph>
        </div>

        <div className="pt-4">
          <Button href="/essays" className="w-full">Read the Latest Essays</Button>
        </div>
      </div>
    </Section>
  )
}
