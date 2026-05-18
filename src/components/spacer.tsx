import { Element } from 'html-react-parser'
import { getAttrib } from '@/utils/parse-blocks-helpers'

interface SpacerProps {
  height?: string
}

export function Spacer({ height = '2rem' }: SpacerProps) {
  return <div style={{ height }} aria-hidden="true" />
}

export function coreSpacer(domNode: Element) {
  const style = getAttrib(domNode, 'style')
  const heightMatch = style.match(/height:\s*(\d+)px/)
  const height = heightMatch ? `${heightMatch[1]}px` : '2rem'
  return <Spacer height={height} />
}
