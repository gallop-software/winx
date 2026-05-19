import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { BlogSearch } from '@/components/blog-search'
import { getAllCategories } from '@/utils/taxonomies'

export default function Search() {
  const categories = getAllCategories()
    .map((c) => ({ name: c.name, slug: c.slug }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <Section className="bg-body py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <Label margin="mb-2">Archive</Label>
          <Heading as="h2" margin="mb-0">
            Search the archive
          </Heading>
        </div>
        <BlogSearch categories={categories} />
      </div>
    </Section>
  )
}
