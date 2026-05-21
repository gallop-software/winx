import { notFound } from 'next/navigation'
import { LightboxWrapper } from '@/components/lightbox-wrapper'
import { blockImports, blockSlugs } from './_block-index'

interface PageProps {
  params: Promise<{
    slug?: string[]
  }>
}

function getSlugPath(slug?: string[]): string | null {
  if (!slug || slug.length === 0) {
    return null
  }
  const normalizedSlug = slug.map((segment) => {
    const decoded = decodeURIComponent(segment)
    return encodeURIComponent(decoded).toLowerCase()
  })
  return normalizedSlug.join('/')
}

export async function generateStaticParams() {
  return blockSlugs.map((slug) => ({
    slug: slug.split('/'),
  }))
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const slugPath = getSlugPath(slug)

  if (!slugPath || typeof slugPath !== 'string') {
    notFound()
  }

  const importFn = blockImports[slugPath]
  if (!importFn) {
    notFound()
  }

  const { default: Content } = await importFn()

  return (
    <div className="overflow-hidden">
      <main>
        <LightboxWrapper>
          <Content />
        </LightboxWrapper>
      </main>
    </div>
  )
}
