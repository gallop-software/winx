'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/icon'
import { formatCompactCount } from '@/utils/format-count'
import { shareTargets } from '@/utils/share-targets'
import { state, useSnapshot } from '@/state'
import { recordShareIntent } from '@/utils/record-share-intent'

interface ShareBarProps {
  title: string
  slug: string
  url: string
}

export function ShareBar({ title, slug, url }: ShareBarProps) {
  const snap = useSnapshot(state)
  const shareCount = snap.shareCounts[slug]
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (state.shareCounts[slug] !== undefined) return
    fetch(`/api/share-count?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (state.shareCounts[slug] === undefined) {
          state.shareCounts[slug] = data.count ?? 0
        }
      })
      .catch(() => {})
  }, [slug])

  return (
    <div className="flex items-center justify-start gap-3 py-10 max-w-full overflow-x-auto scrollbar-hide">
      {typeof shareCount === 'number' && (
        <div className="flex-shrink-0 flex flex-col items-center justify-center pr-2 text-contrast">
          <span className="text-sm font-bold leading-tight">{formatCompactCount(shareCount)}</span>
          <span className="text-[0.65rem] leading-tight">Shares</span>
        </div>
      )}
      <div className="flex gap-3">
        {shareTargets.map((btn) => {
          const isProtocol = btn.id === 'email' || btn.id === 'sms'
          const isCopied = !!(btn.copy && copied)
          const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            if (btn.copy) {
              e.preventDefault()
              const text = btn.getUrl(url, title)
              const done = () => {
                if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
                setCopied(true)
                copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
                recordShareIntent(slug, btn.id)
              }
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(() => {})
              } else {
                const ta = document.createElement('textarea')
                ta.value = text
                ta.style.position = 'fixed'
                ta.style.opacity = '0'
                document.body.appendChild(ta)
                ta.select()
                try {
                  document.execCommand('copy')
                } catch {}
                document.body.removeChild(ta)
                done()
              }
              return
            }
            recordShareIntent(slug, btn.id)
          }
          return (
            <a
              key={btn.id}
              href={btn.copy ? '#' : btn.getUrl(url, title)}
              {...(isProtocol || btn.copy
                ? {}
                : { target: '_blank', rel: 'noopener noreferrer' })}
              onClick={handleClick}
              style={{ backgroundColor: btn.color, color: '#fff' }}
              className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Icon icon={btn.icon} className="h-4 w-4 fill-current" />
              {isCopied ? 'Copied' : btn.label}
            </a>
          )
        })}
      </div>
    </div>
  )
}
