'use client'

import { useEffect, useRef } from 'react'
import Swiper from 'swiper'
import {
  Pagination,
  Autoplay,
  EffectFade,
  Navigation,
  Keyboard,
} from 'swiper/modules'
import { useInView } from 'react-intersection-observer'
import 'swiper/css'
import 'swiper/css/autoplay'
import 'swiper/css/effect-fade'
import 'swiper/css/navigation'

interface SwiperSliderInitProps {
  swiperId: string
  layout?: 'slider' | 'carousel'
  columns?: 2 | 3 | undefined
  autoHeight?: boolean
}

const SwiperSliderInit = ({
  swiperId,
  layout = 'slider',
  columns,
  autoHeight = true,
}: SwiperSliderInitProps) => {
  const initializedRef = useRef(false)
  const swiperInstanceRef = useRef<Swiper | null>(null)
  const { ref, inView } = useInView({
    threshold: 0.9,
  })

  useEffect(() => {
    const swiperContainer = document.getElementById(swiperId)
    if (swiperContainer) {
      ref(swiperContainer)
    }
  }, [swiperId, ref])

  useEffect(() => {
    const swiper = swiperInstanceRef.current
    if (!swiper) return

    if (inView) {
      // Configure and start autoplay when in view
      if (swiper.params) {
        swiper.params.autoplay = {
          delay: 4500,
          pauseOnMouseEnter: false,
          disableOnInteraction: true,
        }
      }
      swiper.autoplay?.start()
    } else {
      swiper.autoplay?.stop()
    }
  }, [inView])

  useEffect(() => {
    if (initializedRef.current) return // Ensure initialization only happens once

    const swiperContainer = document.getElementById(swiperId)

    if (!swiperContainer) return

    // Initialize Swiper with layout-specific config
    const config: any = {
      modules: [Pagination, Autoplay, EffectFade, Navigation, Keyboard],
      spaceBetween: 30,
      autoHeight,
      observer: true,
      observeParents: true,
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },
      autoplay: false, // Autoplay enabled only when in view
      on: {
        init: function () {
          // Fade in swiper after initialization
          swiperContainer.classList.remove('opacity-0')
          swiperContainer.classList.add('opacity-100')
        },
      },
    }

    if (layout === 'slider') {
      config.pagination = {
        el: `#${swiperId} .swiper-pagination`,
        clickable: true,
      }
      config.navigation = {
        prevEl: `.swiper-button-prev-${swiperId}`,
        nextEl: `.swiper-button-next-${swiperId}`,
      }
      if (!columns) {
        config.loop = true
        config.effect = 'fade'
        config.fadeEffect = { crossFade: true }
      }

      if (columns) {
        config.slidesPerView = 1
        config.breakpoints = {
          768: { slidesPerView: columns === 2 ? 2 : 2 },
          1024: { slidesPerView: columns },
        }
      }
    } else if (layout === 'carousel') {
      config.loop = false
      config.slidesPerView = 1
      config.breakpoints = {
        768: { slidesPerView: columns === 2 ? 2 : 2 },
        1024: { slidesPerView: columns },
      }
      config.navigation = {
        prevEl: `.swiper-button-prev-${swiperId}`,
        nextEl: `.swiper-button-next-${swiperId}`,
      }
    }

    swiperInstanceRef.current = new Swiper(swiperContainer, config)

    // Force enable keyboard after initialization
    if (swiperInstanceRef.current?.keyboard) {
      swiperInstanceRef.current.keyboard.enable()
    }

    // Mark as initialized
    initializedRef.current = true

    return () => {
      swiperInstanceRef.current?.destroy()
      initializedRef.current = false
    }
  }, [swiperId, autoHeight, columns, layout])

  return null
}

export default SwiperSliderInit
