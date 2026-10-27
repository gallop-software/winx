import { BlogClient } from '@/components/blog/blog-client'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { Section } from '@/components/section'
import { archiveLabel, archivePath } from '@/utils/archive-seo'
import { ARCHIVE_PER_PAGE, type DateArchive } from '@/utils/date-archive'

interface DateArchiveProps {
  loaded: DateArchive
  page: number
  year: string
  month?: string
}

// A year's or a month's posts, as the category page shows a category's.
export default function DateArchive({
  loaded,
  page,
  year,
  month,
}: DateArchiveProps) {
  const { archive, result } = loaded
  return (
    <Section className="pt-7 pb-10">
      <Label margin="mb-2">{archiveLabel(archive.kind)}</Label>
      <Heading
        as="h1"
        margin="mb-10"
      >
        {archive.name}
      </Heading>
      <BlogClient
        initialPosts={result.posts}
        initialTotalPages={result.totalPages}
        initialPage={page}
        perPage={ARCHIVE_PER_PAGE}
        query={{ year, ...(month ? { month } : {}) }}
        pagePath={archivePath(archive)}
      />
    </Section>
  )
}
