import Link from 'next/link'
import { Heading } from '@/components/heading'

export interface CardLink2Data {
  name: string
  description: string
  href: string
  icon: string
}

interface Card2Props {
  name: string
  description: string
  href: string
  icon: string
  backgroundClass?: string
}

export function Card2({
  name,
  href,
  backgroundClass = 'bg-body2',
}: Card2Props) {
  return (
    <Link
      key={name}
      href={href}
      className="group relative"
      aria-label={`Navigate to ${name}`}
      prefetch={true}
      scroll={true}
    >
      <div
        className={`relative h-[200px] rounded-lg shadow-lg flex items-center justify-center py-8 ${backgroundClass}`}
      >
        <Heading
          as="h3"
          color="text-contrast"
          textAlign="text-center"
          margin="m-0"
          className="w-full px-8 whitespace-normal break-words"
        >
          {name}
        </Heading>
      </div>
    </Link>
  )
}
