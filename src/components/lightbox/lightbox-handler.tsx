'use client'

import { useState, useEffect } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import { NextJsImage, NextJsThumbnail } from './next-js-image'
import type { SlideImage } from 'yet-another-react-lightbox'

interface Slide extends SlideImage {
  description?: string
  thumbnail?: string
}

interface LightboxHandlerProps {
  containerRef: React.RefObject<HTMLElement | null>
}

const lightboxStyles = {
  root: {
    '--yarl__slide_description_color': 'var(--color--gallery-contrast,#000000)',
    '--yarl__slide_captions_container_background': 'none',
    '--yarl__color_button_active': 'var(--color--gallery-contrast,#000000)',
    '--yarl__button_filter': 'none',
    '--yarl__counter_filter': 'none',
    '--yarl__color_button': 'var(--color--gallery-contrast,#000000)',
    '--yarl__thumbnails_thumbnail_background': 'transparent',
    '--yarl__thumbnails_container_background_color':
      'var(--color--gallery,rgba(255,255,255,0.7))',
    '--yarl__container_background_color':
      'var(--color--gallery,rgba(255,255,255,0.7))',
    '--yarl__color_backdrop': 'transparent',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    '--yarl__color_button_disabled': 'transparent',
  },
  slide: {
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
  },
  captionsDescriptionContainer: {
    position: 'relative' as const,
    paddingBottom: 0,
  },
  captionsDescription: {
    maxWidth: '700px',
    marginLeft: 'auto',
    marginRight: 'auto',
    fontSize: '1rem',
    lineHeight: '1.5rem',
    fontStyle: 'italic',
    textAlign: 'left' as const,
    opacity: 0.7,
  },
}

const createSlide = (el: Element): Slide | null => {
  const anchorElement = el.querySelector(':scope > a')
  const imgElement = el.querySelector('img')

  if (!anchorElement || !imgElement) {
    return null
  }

  const src = anchorElement.getAttribute('href') || ''
  const srcset = imgElement.getAttribute('srcset') || ''
  const srcSet = srcset
    ? srcset.split(',').map((entry) => {
        const [url = '', size = '0'] = entry.trim().split(' ')
        return {
          src: url,
          width: parseInt(size, 10),
          height: parseInt(size, 10),
        }
      })
    : undefined

  const width = imgElement.getAttribute('width')
    ? parseInt(imgElement.getAttribute('width') || '', 10)
    : undefined
  const height = imgElement.getAttribute('height')
    ? parseInt(imgElement.getAttribute('height') || '', 10)
    : undefined

  let figcaption: Element | null = el.querySelector('figcaption')
  if (!figcaption) {
    // Fall back to a gallery-level <figcaption> on an ancestor <figure>
    let ancestor: Element | null = el.parentElement
    while (ancestor) {
      if (ancestor.tagName === 'FIGURE') {
        const direct = Array.from(ancestor.children).find(
          (c) => c.tagName === 'FIGCAPTION'
        )
        if (direct) {
          figcaption = direct
          break
        }
      }
      ancestor = ancestor.parentElement
    }
  }
  const description = figcaption ? figcaption.textContent?.trim() || '' : ''

  const thumbnail =
    srcSet && srcSet.length
      ? srcSet.reduce((smallest, current) => {
          return current.width < smallest.width ? current : smallest
        }).src
      : src

  return {
    src,
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
    alt: description,
    ...(srcSet && { srcSet }),
    imageFit: 'contain',
    thumbnail,
    description,
  }
}

export function LightboxHandler({ containerRef }: LightboxHandlerProps) {
  const [slides, setSlides] = useState<Slide[]>([])
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Find all lightbox items directly within the container
    const lightboxItems = Array.from(
      container.querySelectorAll('a.lightbox-item')
    )
      .map((anchor) => anchor.parentElement)
      .filter((el): el is HTMLElement => el !== null)

    if (lightboxItems.length === 0) return

    const slideData = lightboxItems
      .map((el) => createSlide(el))
      .filter((slide): slide is Slide => slide !== null)

    setSlides(slideData)

    // Add click listeners
    const listeners: { element: HTMLElement; handler: EventListener }[] = []

    lightboxItems.forEach((el, idx) => {
      const anchor = el.querySelector('a.lightbox-item')
      if (anchor) {
        const handler = (event: Event) => {
          event.preventDefault()
          setIndex(idx)
          setOpen(true)
        }
        anchor.addEventListener('click', handler)
        listeners.push({ element: anchor as HTMLElement, handler })
      }
    })

    return () => {
      listeners.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler)
      })
    }
  }, [containerRef])

  if (slides.length === 0) return null

  return (
    <Lightbox
      index={index}
      open={open}
      close={() => setOpen(false)}
      slides={slides as SlideImage[]}
      plugins={
        slides.length <= 1 ? [Captions] : [Captions, Thumbnails, Counter]
      }
      thumbnails={{ position: 'bottom', showToggle: true }}
      captions={{ showToggle: true, descriptionMaxLines: 8 }}
      controller={{ closeOnPullDown: true, closeOnBackdropClick: true }}
      carousel={{ finite: true }}
      styles={lightboxStyles}
      render={{ slide: NextJsImage, thumbnail: NextJsThumbnail }}
    />
  )
}
