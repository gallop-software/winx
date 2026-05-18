import { Section } from '@/components/section'
import { Blog } from '@/components/blog'

export default function Archive() {
  return (
    <Section className="bg-body2 pt-6 pb-20">
      <Blog categoriesExclude={['Portfolio']} />
    </Section>
  )
}
