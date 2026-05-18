import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { BlogSearch } from '@/components/blog-search'
import { getAllCategories } from '@/utils/taxonomies'

export default function Search() {
  const categories = getAllCategories()
    .map((c) => ({ name: c.name, slug: c.slug }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <Section className="bg-body2 py-20">
      <Heading
        as="h2"
        textAlign="text-center"
        margin="mb-12"
      >
        Search the archive
      </Heading>
      <BlogSearch categories={categories} />
    </Section>
  )
}
