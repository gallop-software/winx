import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { Grid } from '@/components/grid'
import { CardTestimonial3 } from '@/components/card-testimonial-3'

export default function Testimonial() {
  return (
    <Section className="bg-body py-10">
      <div className="mb-4">
        <Label margin="mb-2">Readers</Label>
        <Heading
          as="h2"
          margin="mb-2"
        >
          What Our Readers Are Saying
        </Heading>
      </div>
      <Grid
        gap="gap-6"
        cols="grid-cols-1 md:grid-cols-2"
      >
        <CardTestimonial3
          name="Priya Shah"
          title="Founder, Cohort Labs"
          review="Founder Notes is the rare newsletter I actually read top to bottom. The essays cut through the usual startup noise and get at the unglamorous decisions that actually move a company forward. It has become required reading for my whole leadership team."
        />
        <CardTestimonial3
          name="Marcus Bell"
          title="Operator & Angel Investor"
          review="Every issue lands with something I end up quoting in a board meeting later that week. Honest, specific, and refreshingly free of hype. This is what good writing about building companies looks like."
        />
        <CardTestimonial3
          name="Elena Vasquez"
          title="Product Lead, Lumen"
          review="I have unsubscribed from almost every founder newsletter except this one. The reporting feels firsthand and the framing is sharper than most paid publications I subscribe to. Worth recommending to anyone building something serious."
        />
        <CardTestimonial3
          name="David Okafor"
          title="Two-time Founder"
          review="The piece on hiring your first ten people changed how I run my own company. Practical without being prescriptive, and grounded in real conversations with people who have actually done the work."
        />
      </Grid>
    </Section>
  )
}
