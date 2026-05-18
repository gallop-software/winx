// import Image from 'next/image'
import {
  isImageFitCover,
  isImageSlide,
  useLightboxProps,
} from 'yet-another-react-lightbox'

function isNextJsImage(slide: any) {
  return (
    isImageSlide(slide) &&
    typeof slide.width === 'number' &&
    typeof slide.height === 'number'
  )
}

export function NextJsThumbnail({ slide, rect }: any) {
  const { imageFit } = useLightboxProps().carousel
  const cover = isImageSlide(slide) && isImageFitCover(slide, imageFit)

  if (!isNextJsImage(slide)) return undefined

  const width = !cover
    ? Math.round(
        Math.min(rect.width, (rect.height / slide.height) * slide.width)
      )
    : rect.width

  const height = !cover
    ? Math.round(
        Math.min(rect.height, (rect.width / slide.width) * slide.height)
      )
    : rect.height

  return (
    <div style={{ position: 'relative', width, height }}>
      <img
        // fill
        alt=""
        src={slide.thumbnail}
        loading="eager"
        draggable={true}
        // placeholder={`data:image/svg+xml;base64,${toBase64(
        // shimmer(width, height)
        // )}`}
        style={{ objectFit: cover ? 'cover' : 'contain' }}
        sizes={`${Math.ceil((width / window.innerWidth) * 100)}vw`}
      />
    </div>
  )
}
export function NextJsImage({ slide, rect }: any) {
  const { imageFit } = useLightboxProps().carousel
  const cover = isImageSlide(slide) && isImageFitCover(slide, imageFit)

  if (!isNextJsImage(slide)) return undefined

  const width = !cover
    ? Math.round(
        Math.min(rect.width, (rect.height / slide.height) * slide.width)
      )
    : rect.width

  const height = !cover
    ? Math.round(
        Math.min(rect.height, (rect.width / slide.width) * slide.height)
      )
    : rect.height

  return (
    <div style={{ position: 'relative', width: width, height }}>
      <img
        // fill
        alt=""
        src={slide.src}
        loading="eager"
        draggable={true}
        // placeholder={`data:image/svg+xml;base64,${toBase64(
        // shimmer(width, height)
        // )}`}
        style={{ objectFit: cover ? 'cover' : 'contain' }}
        sizes={`${Math.ceil((width / window.innerWidth) * 100)}vw`}
        className="absolute h-full w-full inset-0 object-contain"
      />
    </div>
  )
}
