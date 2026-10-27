import { DateTime } from 'luxon'
import { Section } from '@/components/section'
import { Grid } from '@/components/grid'
import { Heading } from '@/components/heading'
import { Link } from '@/components/link'
import { List, Li } from '@/components/list'
import { Span } from '@/components/span'
import { getMonthCounts } from '@/utils/content-index'
import { getAllCategories } from '@/utils/taxonomies'

function monthName(year: string, month: string): string {
  return DateTime.fromObject({
    year: Number(year),
    month: Number(month),
  }).toFormat('LLLL yyyy')
}

export default async function Archive() {
  const months = await getMonthCounts()
  // A category with no posts has no page to browse.
  const categories = (await getAllCategories()).filter(
    (category) => (category.count ?? 0) > 0
  )

  return (
    <Section className="bg-body pb-10 pt-5">
      <Grid
        cols="grid-cols-1 md:grid-cols-2"
        gap="gap-10"
      >
        <div>
          <Heading
            as="h2"
            margin="mb-4"
          >
            Browse by Month
          </Heading>
          <List
            variant="unstyled"
            spacing="tight"
            margin="mb-0"
          >
            {months.map((item) => (
              <Li key={`${item.year}-${item.month}`}>
                <Link href={`/${item.year}/${item.month}/`}>
                  {monthName(item.year, item.month)}
                </Link>
                <Span
                  color="text-contrast-light"
                  fontSize="text-xs"
                >
                  {' '}
                  ({item.count})
                </Span>
              </Li>
            ))}
          </List>
        </div>
        <div>
          <Heading
            as="h2"
            margin="mb-4"
          >
            Browse by Category
          </Heading>
          <List
            variant="unstyled"
            spacing="tight"
            margin="mb-0"
          >
            {categories.map((category) => (
              <Li key={category.slug}>
                <Link href={`/category/${category.slug}/`}>
                  {category.name}
                </Link>
                <Span
                  color="text-contrast-light"
                  fontSize="text-xs"
                >
                  {' '}
                  ({category.count})
                </Span>
              </Li>
            ))}
          </List>
        </div>
      </Grid>
    </Section>
  )
}
