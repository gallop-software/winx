import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Button } from '@/components/button'
import Link from 'next/link'
import arrowDownIcon from '@iconify/icons-heroicons/arrow-down'

export default function Intro() {
  return (
    <Section className="bg-body2 py-20">
      <div className="text-center max-w-4xl mx-auto">
        <Heading as="h1" textAlign="text-center" margin="mb-4">
          Douglas Newby insights on Architecturally Significant Homes,
          Neighborhoods, and the Evolution of Cities
        </Heading>
        <Heading as="h2" textAlign="text-center" margin="mb-10">
          Impact on Homes That Make Us Happy
        </Heading>
        <Paragraph textAlign="text-center" className="max-w-4xl mx-auto">
          Douglas Newby is a national award-winning realtor who identifies
          architectural significance, value, and homes that make people happy.
          Insights offered in these articles include the nuance and evolution
          of neighborhoods, cities and Dallas. If you are interested in
          purchasing an Architecturally Significant Home, go to{' '}
          <Link
            href="https://dougnewby.com/"
            className="text-accent underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Douglas Newby &amp; Associates real estate site DougNewby.com
          </Link>
          .
        </Paragraph>
        <div className="mt-8">
          <Button
            href="#favorite-articles"
            icon={arrowDownIcon}
            iconPlacement="after"
          >
            See All Douglas Newby Blog Articles
          </Button>
        </div>
      </div>
    </Section>
  )
}
