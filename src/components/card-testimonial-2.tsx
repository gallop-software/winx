import React from 'react'
import { clsx } from 'clsx'
import { Image } from '@/components/image'

interface CardTestimonial2Props {
  /** Image source URL for the testimonial author */
  img: string
  /** Name or citation for the testimonial author */
  cite: string
  /** Testimonial content - should be Paragraph components */
  children: React.ReactNode
  /** Custom aspect ratio classes for the image (default: "aspect-[3/4]") */
  aspect?: string
  /** Custom rounded classes for the image (default: "rounded-t-full") */
  rounded?: string
}

export function CardTestimonial2({
  img,
  cite,
  children,
  aspect = 'aspect-[3/4]',
  rounded = 'rounded-t-full',
}: CardTestimonial2Props) {
  return (
    <div className="flex flex-col items-center relative">
      <Image
        src={img}
        alt={cite}
        rounded={rounded}
        wrap={false}
        size="large"
        aspect={aspect}
        className={clsx(
          aspect,
          'w-[85%] lg:w-[75%] object-cover shadow-xl max-w-lg mx-auto relative z-10'
        )}
      />
      <div className="px-6 text-center w-full border border-accent2 pt-[130px] -mt-24 relative z-0 [&>*:last-child]:mb-0 pb-14 [&>*]:max-w-lg flex justify-center flex-col items-center">
        {children}
      </div>
    </div>
  )
}
