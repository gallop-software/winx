import { Paragraph } from '@/components/paragraph'
import { Heading } from '@/components/heading'
import { Label } from '@/components/label'
import { Icon } from '@/components/icon'
import { Image } from '@/components/image'
import starIcon from '@iconify/icons-heroicons/star-solid'

interface CardTestimonial3Props {
  name: string
  title: string
  review: string
  rating?: number
  /** Optional profile headshot image URL */
  image?: string
}

export function CardTestimonial3({
  name,
  title,
  review,
  rating = 5,
  image,
}: CardTestimonial3Props) {
  return (
    <div className="bg-body rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Stars */}
      <div className="flex gap-1 mb-6">
        {[...Array(rating)].map((_, i) => (
          <Icon
            key={i}
            icon={starIcon}
            className="text-accent text-lg"
          />
        ))}
      </div>

      {/* Review */}
      <Paragraph
        color="text-body-muted"
        margin="mb-6"
        lineHeight="leading-relaxed"
        className="grow"
      >
        {review}
      </Paragraph>

      {/* Author */}
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
          <Heading
            as="h4"
            fontSize="text-base"
            color="text-accent1"
            margin="mb-2"
          >
            {name}
          </Heading>
          <Label>{title}</Label>
        </div>
      </div>
    </div>
  )
}
