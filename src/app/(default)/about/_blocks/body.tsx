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
          <Paragraph margin="mt-4 mb-4">
            A great deal of startup writing is either too abstract to be
            useful or too tactical to be credible. Founder Notes is intended
            to occupy the space between the two — substantive enough to
            support clear thinking, specific enough to inform real decisions,
            and grounded in the perspective of operators who have shipped
            product, raised capital, navigated difficult hires, and learned
            from each.
          </Paragraph>
          <Paragraph margin="mt-4 mb-0">
            The objective is not to promote a framework or sell a course. It
            is to help founders reason more clearly about the decisions in
            front of them.
          </Paragraph>
        </div>

        <div>
          <Heading as="h3" margin="mb-4">
            What you&rsquo;ll find here
          </Heading>
          <Paragraph margin="mt-4 mb-0">
            Long-form essays on product strategy, fundraising, hiring,
            go-to-market, and leadership — including the less visible aspects
            of company building that rarely surface on a conference stage.
            One essay is published each Sunday, alongside a growing archive
            that can be read in any order.
          </Paragraph>
        </div>

        <div>
          <Heading as="h3" margin="mb-4">
            Who it&rsquo;s for
          </Heading>
          <Paragraph margin="mt-4 mb-0">
            Founder Notes is written for those building companies at any
            stage — pre-seed, post product-market fit, or anywhere in
            between — as well as for the investors, advisors, and operators
            who work alongside them.
          </Paragraph>
        </div>

        <div>
          <Heading as="h3" margin="mb-4">
            How it&rsquo;s funded
          </Heading>
          <Paragraph margin="mt-4 mb-0">
            Founder Notes is entirely reader-supported. There are no
            sponsored posts, paid placements, or display advertisements —
            only the writing itself.
          </Paragraph>
        </div>

        <div className="pt-4">
          <Button href="/essays" className="w-full">Read the Latest Essays</Button>
        </div>
      </div>
    </Section>
  )
}
