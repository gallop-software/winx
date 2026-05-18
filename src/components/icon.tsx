interface IconProps {
  icon: { body: string; width?: number; height?: number }
  className?: string
}

export function Icon({ icon, className = 'h-7 w-7' }: IconProps) {
  if (!icon || !icon.body) {
    console.error('Icon: Invalid icon data', icon)
    return null
  }

  const width = icon.width || 24
  const height = icon.height || 24
  const viewBox = `0 0 ${width} ${height}`

  return (
    <svg
      className={className}
      width="1em"
      height="1em"
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  )
}
