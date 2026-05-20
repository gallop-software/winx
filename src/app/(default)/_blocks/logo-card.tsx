import { Section } from '@/components/section'
import { Image } from '@/components/image'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Label } from '@/components/label'
import { Button } from '@/components/button'
import arrowRightIcon from '@iconify/icons-heroicons/arrow-right'
import blogData from '@/../_data/_blog.json'
import type { BlogPost } from '@/utils/filter-posts'

export default function LogoCard() {
  const posts = blogData as BlogPost[]
  const latest = [...posts].sort((a, b) =>
    (b.metadata.date || '').localeCompare(a.metadata.date || '')
  )[0]
  const title = latest?.metadata.title || 'Founder Notes'
  const description = latest?.metadata.description || ''
  const href = latest?.url || '#favorite-articles'
  const image = latest?.metadata.featuredImage || '/banner.jpg'
  const imageWidth = latest?.metadata.featuredImageWidth
  const imageHeight = latest?.metadata.featuredImageHeight
  return (
    <Section
      innerAlign="full"
      className="bg-body pt-7 pb-10"
    >
      <div className="relative overflow-hidden rounded-2xl border border-accent5 shadow-sm bg-body2 min-h-[420px]">
        <div className="absolute inset-0">
          <Image
            src={image}
            alt={title}
            size="large"
            width={imageWidth}
            height={imageHeight}
            rounded="rounded-none"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-body via-body/85 to-transparent" />
        <div className="relative grid grid-cols-1 lg:grid-cols-2">
          <div className="p-10 sm:p-12 lg:p-16 flex flex-col justify-center max-w-xl xl:max-w-none">
            <Label margin="mb-5">Featured Essay</Label>
            <Heading
              as="h2"
              margin="mb-5"
            >
              {title}
            </Heading>
            <Paragraph margin="mb-8">{description}</Paragraph>
            <div className="flex flex-wrap items-center gap-5">
              <Button
                href={href}
                variant="outline"
                icon={arrowRightIcon}
                iconPlacement="after"
              >
                Read the Essay
              </Button>
              <Button
                href="#favorite-articles"
                variant="text"
              >
                View All Essays
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
