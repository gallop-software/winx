import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Link } from '@/components/link'
import { List, Li } from '@/components/list'
import { getPageTree, type PageNode } from '@/utils/pages'

function PageList({
  pages,
  nested = false,
}: {
  pages: PageNode[]
  nested?: boolean
}) {
  return (
    <List
      variant="unstyled"
      spacing="tight"
      margin="mb-0"
      className={nested ? 'pl-6 mt-1' : ''}
    >
      {pages.map((page) => (
        <Li key={page.id}>
          <Link href={`${page.path}/`}>{page.title}</Link>
          {page.children.length > 0 && (
            <PageList
              pages={page.children}
              nested
            />
          )}
        </Li>
      ))}
    </List>
  )
}

// The site's pages as WordPress arranges them, from the content index. The
// archives page itself is left out: it is this page.
export default async function Pages() {
  const pages = (await getPageTree()).filter(
    (page) => page.path !== '/archives'
  )
  if (!pages.length) return null

  return (
    <Section className="bg-body pt-5">
      <div className="rounded-2xl border border-accent/15 bg-accent/5 p-7 sm:p-10">
        <Heading
          as="h2"
          margin="mb-4"
        >
          Browse pages
        </Heading>
        <PageList pages={pages} />
      </div>
    </Section>
  )
}
