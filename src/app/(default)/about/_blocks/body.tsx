import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Button } from '@/components/button'

const sections = [
  {
    title:
      'An independent publication for the people building today’s companies.',
    paragraphs: [
      'Each week, Founder Notes publishes a single, carefully considered essay on product strategy, fundraising, hiring, and the practical realities of building an early-stage company. No social threads, no promotional content, and no sponsored commentary.',
    ],
  },
  {
    title: 'Why this exists',
    paragraphs: [
      'A great deal of startup writing is either too abstract to be useful or too tactical to be credible. Founder Notes is intended to occupy the space between the two — substantive enough to support clear thinking, specific enough to inform real decisions, and grounded in the perspective of operators who have shipped product, raised capital, navigated difficult hires, and learned from each.',
      'The objective is not to promote a framework or sell a course. It is to help founders reason more clearly about the decisions in front of them.',
    ],
  },
  {
    title: 'What you’ll find here',
    paragraphs: [
      'Long-form essays on product strategy, fundraising, hiring, go-to-market, and leadership — including the less visible aspects of company building that rarely surface on a conference stage. One essay is published each Sunday, alongside a growing archive that can be read in any order.',
    ],
  },
  {
    title: 'Who it’s for',
    paragraphs: [
      'Founder Notes is written for those building companies at any stage — pre-seed, post product-market fit, or anywhere in between — as well as for the investors, advisors, and operators who work alongside them.',
    ],
  },
  {
    title: 'How it’s funded',
    paragraphs: [
      'Founder Notes is entirely reader-supported. There are no sponsored posts, paid placements, or display advertisements — only the writing itself.',
    ],
  },
]

export default function Body() {
  return (
    <Section className="bg-body pb-10">
      <div className="max-w-3xl space-y-6">
        {sections.map((s) => (
          <div key={s.title}>
            <Heading
              as="h2"
              margin="mb-4"
            >
              {s.title}
            </Heading>
            {s.paragraphs.map((p, i) => (
              <Paragraph
                key={i}
                margin={i === s.paragraphs.length - 1 ? 'mb-0' : 'mb-4'}
              >
                {p}
              </Paragraph>
            ))}
          </div>
        ))}
        <div className="pt-2">
          <Button href="/#favorite-articles">Read the Latest Essays</Button>
        </div>
      </div>
    </Section>
  )
}
