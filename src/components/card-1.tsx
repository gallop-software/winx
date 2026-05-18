import Link from 'next/link'
import { Heading } from '@/components/heading'
import { Image } from '@/components/image'

export interface CardLinkData {
  id: string
  title: string
  image: string
  href: string
  alt: string
  width?: number | undefined
  height?: number | undefined
  /** Image size variant to use from metadata - defaults to 'large' */
  size?: 'small' | 'medium' | 'large' | 'full'
}

interface Card1Props {
  id?: string
  title: string
  image: string
  href: string
  alt: string
  width?: number
  height?: number
  /** Image size variant to use from metadata - defaults to 'large' */
  size?: 'small' | 'medium' | 'large' | 'full'
  /** Whether this is an external link that should open in a new tab */
  external?: boolean
}

export function Card1({
  id,
  title,
  image,
  href,
  alt,
  width,
  height,
  size = 'large',
  external = false,
}: Card1Props) {
  return (
    <Link
      key={id}
      href={href}
      className="group relative focus:outline-none"
      aria-label={`Navigate to ${title}`}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      prefetch={true}
      scroll={true}
    >
      {/* Card Container */}
      <div className="relative h-[400px] rounded-lg shadow-lg">
        {/* Background Image */}
        <Image
          src={image}
          alt={alt}
          width={width}
          height={height}
          size={size}
          className="absolute inset-0 w-full h-full object-cover"
          rounded=""
        />

        {/* Vertical Text Label - Rotated 90 degrees */}
        <Heading
          as="h3"
          color="text-body2-contrast"
          className="absolute flex items-center -rotate-90 h-14 right-20 xl:right-24 -top-10 transform origin-top-right bg-body2 px-12 whitespace-nowrap shadow-lg !text-[1.4rem]"
        >
          {title}
        </Heading>
      </div>
    </Link>
  )
}
