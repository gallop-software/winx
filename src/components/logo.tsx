import { Image } from '@/components/image'

interface LogoProps {
  className?: string
  width?: number
  height?: number
  dark?: boolean
}

export function Logo({
  className = '',
  width,
  height,
  dark = false,
}: LogoProps) {
  return (
    <Image
      rounded="rounded-none"
      src={dark ? '/images/logo-dn-in.png' : '/images/logo-dn-in.png'}
      size="medium"
      alt="Logo"
      {...(width && { width })}
      {...(height && { height })}
      className={className}
    />
  )
}
