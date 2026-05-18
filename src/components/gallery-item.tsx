import { Image, type ImageProps } from '@/components/image'

// GalleryItem component for gallery items - just Image with wrap=false
export interface GalleryItemProps extends Omit<ImageProps, 'wrap'> {}

export function GalleryItem(props: GalleryItemProps) {
  return (
    <Image
      {...props}
      alt={props.alt || ''}
      wrap={false}
      mediaLink={!props.href}
    />
  )
}
