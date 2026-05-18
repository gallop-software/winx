import { useId, Children } from 'react'
import SwiperSliderInit from '@/hooks/swiper-slider-init'
import clsx from 'clsx'
import { Icon } from '@/components/icon'
import arrowLongRightIcon from '@iconify/icons-heroicons/arrow-long-right-20-solid'
import arrowLongLeftIcon from '@iconify/icons-heroicons/arrow-long-left-20-solid'

interface SwiperProps {
  /** Child components to render inside the swiper */
  children: React.ReactNode
  /** Layout type: "slider" (default) or "carousel" */
  layout?: 'slider' | 'carousel'
  /** Text for the next button in carousel layout (default: "See More") */
  nextButtonText?: string
  /** Number of columns for carousel layout (2 or 3, default: 3) */
  columns?: 2 | 3
}

export function Swiper({
  children,
  layout = 'slider',
  nextButtonText = 'See More',
  columns,
}: SwiperProps) {
  let swiperId = 'swiper-' + useId()
  swiperId = swiperId.replace(/:/g, '-')

  if (!columns && layout === 'carousel') {
    columns = 3
  }

  return (
    <>
      {layout === 'carousel' && (
        <div className="w-full flex justify-between mb-3 mt-0">
          <button
            className={`swiper-button-prev-${swiperId} text-accent hover:text-accent/80 text-base justify-end flex flex-row items-center gap-2 cursor-pointer disabled:opacity-40 transition-opacity`}
            aria-label="Previous slide"
          >
            <Icon
              icon={arrowLongLeftIcon}
              className="shrink-0 h-auto w-6"
            />
          </button>
          <button
            className={`swiper-button-next-${swiperId} text-accent hover:text-accent/80 text-sm justify-end flex flex-row items-center gap-2 cursor-pointer disabled:opacity-40 transition-opacity ml-4`}
            aria-label="Next slide"
          >
            <span className="hidden sm:inline">{nextButtonText}</span>
            <Icon
              icon={arrowLongRightIcon}
              className="shrink-0 h-auto w-6"
            />
          </button>
        </div>
      )}
      <div
        id={swiperId}
        className={clsx(
          'swiper lg:mt-0 opacity-0 transition-opacity duration-300',
          layout === 'carousel' && 'overflow-visible!',
          layout === 'slider' && 'max-w-[950px] xl:max-w-none'
        )}
      >
        <div className="swiper-wrapper flex items-start mb-20">
          {Children.map(children, (child, index) => (
            <div
              key={index}
              className="swiper-slide"
            >
              {child}
            </div>
          ))}
        </div>
        {layout === 'slider' && (
          <div className="z-10 swiper-pagination absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center w-full [&>.swiper-pagination-bullet]:w-3 [&>.swiper-pagination-bullet]:h-3 [&>.swiper-pagination-bullet]:bg-contrast-light [&>.swiper-pagination-bullet]:rounded-full [&>.swiper-pagination-bullet]:opacity-50 [&>.swiper-pagination-bullet]:transition [&>.swiper-pagination-bullet]:duration-300 [&>.swiper-pagination-bullet]:mx-1 [&>.swiper-pagination-bullet]:cursor-pointer [&>.swiper-pagination-bullet-active]:bg-contrast-dark [&>.swiper-pagination-bullet-active]:opacity-100 [&>.swiper-pagination-bullet-active]:scale-110"></div>
        )}
      </div>
      <SwiperSliderInit
        swiperId={swiperId}
        layout={layout}
        columns={columns}
      />
    </>
  )
}
