interface SeparatorProps {
  className?: string
}

export function Separator({ className = '' }: SeparatorProps) {
  return <hr className={`border-body-dark my-8 ${className}`} />
}

export function coreSeparator() {
  return <Separator />
}
