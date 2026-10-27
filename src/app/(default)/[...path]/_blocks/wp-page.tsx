import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { LightboxWrapper } from '@/components/lightbox-wrapper'
import EditLink from '@/components/edit-link'
import { ParseBlocks } from '@/utils/parse-blocks'
import { renderPostTitle } from '@/utils/post-title'
import type { LoadedPage } from '@/utils/wp-page'

interface WpPageProps {
  loaded: LoadedPage
}

// A page from WordPress: its parent's name above its title, then its content
// as the editor wrote it.
export default function WpPage({ loaded }: WpPageProps) {
  const { page, ancestors, data } = loaded
  const content = String(data.post.postContent ?? '')
  const parent = ancestors[ancestors.length - 1]
  const title = String(data.post.postTitle || page.title)

  return (
    <Section className="pt-7 pb-10">
      <div
        className="max-w-3xl"
        data-wp-page={page.id}
      >
        {parent && <Label margin="mb-2">{parent.title}</Label>}
        <Heading
          as="h1"
          margin="mb-5"
        >
          {renderPostTitle(title)}
        </Heading>
        <LightboxWrapper>
          <ParseBlocks content={content} />
        </LightboxWrapper>
      </div>
      <EditLink
        meta={{
          databaseId: page.id,
          slug: page.slug,
          postType: 'page',
          wpUrl: process.env.NEXT_PUBLIC_WORDPRESS_URL || '',
        }}
      />
    </Section>
  )
}
