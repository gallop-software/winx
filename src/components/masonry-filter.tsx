'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Masonry } from '@/components/masonry'
import { Image } from '@/components/image'
import { Span } from '@/components/span'
import { LightboxHandler } from '@/components/lightbox/lightbox-handler'

interface MasonryFilterItem {
  id: number
  category: string
  image: string
  alt: string
}

interface MasonryFilterProps {
  categories: string[]
  items: MasonryFilterItem[]
  gap?: number
  breakpoints?: {
    default: number
    lg?: number
    md?: number
    sm?: number
  }
  className?: string
}

export function MasonryFilter({
  categories,
  items,
  gap = 16,
  breakpoints = { default: 3, lg: 3, md: 2, sm: 1 },
  className,
}: MasonryFilterProps) {
  const [activeFilter, setActiveFilter] = useState('All')
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredItems =
    activeFilter === 'All'
      ? items
      : items.filter((item) => item.category === activeFilter)

  return (
    <>
      {/* Filter nav - glass style */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex flex-wrap justify-center gap-1 md:gap-2 px-4 py-2 rounded-2xl md:rounded-full bg-body/10 backdrop-blur-md border border-body/20 shadow-lg">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className="px-4 py-2 text-xs tracking-wide transition-colors cursor-pointer"
            >
              <Span
                variant="small"
                color={
                  activeFilter === category
                    ? 'text-accent'
                    : 'text-body-contrast/60'
                }
                fontWeight={activeFilter === category ? 'font-semibold' : ''}
                className="relative inline-block transition-colors duration-200 hover:text-body-contrast"
              >
                {category}
                {activeFilter === category && (
                  <motion.div
                    layoutId="filter-underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Span>
            </button>
          ))}
        </div>
      </div>

      {/* Masonry grid with filtered items */}
      <div ref={containerRef}>
        <Masonry
          gap={gap}
          breakpoints={breakpoints}
          className={className ?? ''}
        >
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="overflow-hidden rounded-lg group cursor-pointer"
            >
              <Image
                src={item.image}
                alt={item.alt}
                size="large"
                href={item.image}
                mediaLink
                className="object-cover w-full h-auto transition-transform duration-300 group-hover:scale-102"
              />
            </motion.div>
          ))}
        </Masonry>
        <LightboxHandler
          key={activeFilter}
          containerRef={containerRef}
        />
      </div>
    </>
  )
}
