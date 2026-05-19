import { Paragraph } from '@/components/paragraph'
import { Heading } from '@/components/heading'
import { Image } from '@/components/image'

interface CardTestimonial3Props {
  name: string
  title: string
  review: string
  /** Optional profile headshot image URL */
  image?: string
}

export function CardTestimonial3({
  name,
  title,
  review,
  image,
}: CardTestimonial3Props) {
  return (
    <div className="bg-body rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      <Paragraph className="grow">{review}</Paragraph>

      <div className="mt-auto flex items-center gap-4">
        {image && (
          <Image
            src={image}
            alt={name}
            size="small"
            aspect="aspect-square"
            rounded="rounded-full"
            className="w-14 h-14 shrink-0 object-cover"
          />
        )}
        <div>
          <Heading as="h3" margin="mb-2">
            {name}
          </Heading>
          <Heading as="h4" margin="mb-0" className="capitalize">
            {title}
          </Heading>
        </div>
      </div>
    </div>
  )
}
