import {
  type DOMNode,
  Element,
} from 'html-react-parser'
import { isTag, getAttrib } from '@/utils/parse-blocks-helpers'

interface AudioProps {
  src: string
  className?: string
}

export function Audio({ src, className = '' }: AudioProps) {
  return (
    <figure className={`mb-7 ${className}`}>
      <audio controls src={src} className="w-full">
        <track kind="captions" />
      </audio>
    </figure>
  )
}

export function coreAudio(domNode: Element, className: string) {
  let src = ''
  for (const child of domNode.children as DOMNode[]) {
    if (isTag(child) && child.name === 'audio') {
      src = getAttrib(child, 'src')
    }
  }

  return <Audio src={src} className={className} />
}
