'use client'

import { Icon } from '@/components/icon'
import { Span } from '@/components/span'
import { formatCompactCount } from '@/utils/format-count'
import { shareTargets } from '@/utils/share-targets'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import heartIcon from '@iconify/icons-heroicons/heart'
import heartSolidIcon from '@iconify/icons-heroicons/heart-solid'
import shareIcon from '@iconify/icons-heroicons/arrow-up-tray'
import linkIcon from '@iconify/icons-mdi/link'
import checkIcon from '@iconify/icons-mdi/check'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { state, useSnapshot } from '@/state'
import { getOrCreateAnonId } from '@/utils/anon-id'
import { recordShareIntent } from '@/utils/record-share-intent'

function shareLabel(id: string): string {
  switch (id) {
    case 'facebook':
      return 'Share to Facebook'
    case 'x':
      return 'Share to X'
    case 'linkedin':
      return 'Share to LinkedIn'
    case 'sms':
      return 'Share via Text'
    case 'email':
      return 'Share via Email'
    default:
      return 'Share'
  }
}

interface PostActionsProps {
  postId?: number
  title: string
  url: string
  slug?: string
  size?: 'sm' | 'md'
  className?: string
  skipBackfill?: boolean
}

export function PostActions({
  postId,
  title,
  url,
  slug,
  size = 'sm',
  className,
  skipBackfill = false,
}: PostActionsProps) {
  const iconSize = size === 'md' ? 'w-6 h-6' : 'w-5 h-5'
  const fontSize = size === 'md' ? 'text-base' : 'text-xs'
  const lineHeight = size === 'md' ? 'leading-6' : 'leading-5'

  const snap = useSnapshot(state)
  const likeCount = slug ? snap.likeCounts[slug] : undefined
  const shareCount = slug ? snap.shareCounts[slug] : undefined
  const liked = typeof postId === 'number' ? !!snap.liked[postId] : false
  const countsHydrated = likeCount !== undefined && shareCount !== undefined
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (skipBackfill) return
    if (typeof postId !== 'number' || !slug) return
    if (state.likeCounts[slug] !== undefined && state.liked[postId] !== undefined) return

    let cancelled = false
    const anonId = getOrCreateAnonId()
    fetch(`/api/blog-likes?postIds=${postId}&anonId=${encodeURIComponent(anonId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (state.likeCounts[slug] === undefined) {
          state.likeCounts[slug] = data.counts?.[postId] ?? 0
        }
        if (state.liked[postId] === undefined) {
          state.liked[postId] = Boolean(data.liked?.[postId])
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [postId, slug, skipBackfill])

  useEffect(() => {
    if (skipBackfill || !slug) return
    if (state.shareCounts[slug] !== undefined) return

    let cancelled = false
    fetch(`/api/share-count?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (state.shareCounts[slug] === undefined) {
          state.shareCounts[slug] = data.count ?? 0
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [slug, skipBackfill])

  const onLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof postId !== 'number' || !slug || pending) return
    setPending(true)

    const nextLiked = !liked
    const prevLiked = liked
    const prevCount = state.likeCounts[slug] ?? 0
    state.liked[postId] = nextLiked
    state.likeCounts[slug] = prevCount + (nextLiked ? 1 : -1)

    try {
      const res = await fetch('/api/blog-likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          anonId: getOrCreateAnonId(),
          action: nextLiked ? 'like' : 'unlike',
        }),
      })
      if (!res.ok) throw new Error('request failed')
      const data = await res.json()
      if (typeof data.count === 'number') state.likeCounts[slug] = data.count
    } catch {
      state.liked[postId] = prevLiked
      state.likeCounts[slug] = prevCount
    } finally {
      setPending(false)
    }
  }

  const [copied, setCopied] = useState(false)

  const onCopyLink = async () => {
    if (!slug) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      recordShareIntent(slug, 'copy')
    } catch {}
  }

  return (
    <div className={clsx('inline-flex items-center gap-4', className)}>
      {typeof postId === 'number' && (
        <button
          type="button"
          onClick={onLike}
          aria-label={liked ? 'Unlike post' : 'Like post'}
          aria-pressed={liked}
          className={clsx(
            'inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-200 py-2 pl-2 -my-2 -ml-2',
            liked ? 'text-accent' : 'text-contrast/60 hover:text-accent'
          )}
        >
          <Icon
            icon={liked ? heartSolidIcon : heartIcon}
            className={clsx(iconSize, 'shrink-0')}
          />
          <Span
            fontSize={fontSize}
            lineHeight={lineHeight}
            className={clsx(
              'inline-block min-w-[3ch] text-left',
              !countsHydrated && 'invisible'
            )}
          >
            {countsHydrated ? formatCompactCount(likeCount ?? 0) : '0'}
          </Span>
        </button>
      )}

      <Popover className="relative inline-flex">
        <PopoverButton
          aria-label="Share post"
          className="inline-flex items-center gap-1.5 cursor-pointer text-contrast/60 hover:text-accent transition-colors duration-200 outline-none p-2 -m-2"
        >
          <Icon
            icon={shareIcon}
            className={clsx(iconSize, 'shrink-0')}
          />
          {slug && (
            <Span
              fontSize={fontSize}
              lineHeight={lineHeight}
              className={clsx(
                'inline-block min-w-[3ch] text-left',
                !countsHydrated && 'invisible'
              )}
            >
              {countsHydrated ? formatCompactCount(shareCount ?? 0) : '0'}
            </Span>
          )}
        </PopoverButton>
        <PopoverPanel
          anchor={{ to: 'top start', gap: 8 }}
          className="z-30 min-w-[200px] bg-body shadow-lg rounded-md py-2 border border-contrast/10 outline-none"
        >
          {({ close }) => (
            <>
              {shareTargets.filter((t) => !t.copy).map((target) => {
                const isProtocol = target.id === 'email' || target.id === 'sms'
                return (
                  <a
                    key={target.id}
                    href={target.getUrl(url, title)}
                    {...(isProtocol
                      ? {}
                      : { target: '_blank', rel: 'noopener noreferrer' })}
                    onClick={() => {
                      if (slug) recordShareIntent(slug, target.id)
                      close()
                    }}
                    className="flex items-center gap-3 px-4 py-2 text-xs text-contrast hover:bg-contrast/5 transition-colors"
                  >
                    <span
                      style={{ color: target.color }}
                      className="inline-flex"
                    >
                      <Icon
                        icon={target.icon}
                        className="w-4 h-4 shrink-0"
                      />
                    </span>
                    <span>{shareLabel(target.id)}</span>
                  </a>
                )
              })}
              <button
                type="button"
                onClick={() => {
                  onCopyLink()
                  close()
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs text-contrast hover:bg-contrast/5 transition-colors cursor-pointer"
              >
                <span
                  style={{ color: '#777777' }}
                  className="inline-flex"
                >
                  <Icon
                    icon={copied ? checkIcon : linkIcon}
                    className="w-4 h-4 shrink-0"
                  />
                </span>
                <span>{copied ? 'Link Copied' : 'Copy Link'}</span>
              </button>
            </>
          )}
        </PopoverPanel>
      </Popover>
    </div>
  )
}
