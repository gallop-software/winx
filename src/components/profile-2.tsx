import React from 'react'
import { clsx } from 'clsx'
import { Image } from '@/components/image'
import { Icon } from '@/components/icon'

interface ContactLink {
  /** Iconify icon object */
  icon: { body: string; width?: number; height?: number }
  /** URL for the link */
  link: string
}

interface Profile2Props {
  /** Image source URL for the profile */
  img: string
  /** Name or citation for the profile */
  cite: string
  /** Profile content - should be Heading and Paragraph components */
  children: React.ReactNode
  /** Social media or contact links with icons */
  contact?: ContactLink[]
  /** Background color classes (default: "bg-body2") */
  bgColor?: string
  /** Border radius classes (default: "rounded-lg") */
  rounded?: string
  /** Border classes (default: "border border-accent/20") */
  border?: string
}

export function Profile2({
  img,
  cite,
  children,
  contact,
  bgColor = 'bg-body2',
  rounded = 'rounded-lg',
  border = 'border border-accent/10',
}: Profile2Props) {
  return (
    <div
      className={clsx(
        bgColor,
        rounded,
        border,
        'shadow-xl flex flex-col p-10 h-full'
      )}
    >
      <Image
        src={img}
        alt={cite}
        rounded="rounded-full"
        wrap={false}
        size="small"
        aspect="aspect-square"
        className="w-40 h-40 object-cover mb-6"
      />
      <div className="text-left w-full [&>*:last-child]:mb-0 flex justify-start flex-col items-start h-full">
        {children}
        {contact && contact.length > 0 && (
          <div className="flex gap-4 justify-center mt-auto">
            {contact.map((item, index) => (
              <a
                key={index}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent/80 transition-colors"
              >
                <Icon
                  icon={item.icon}
                  className="w-6 h-6"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
