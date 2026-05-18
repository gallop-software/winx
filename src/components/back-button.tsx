'use client'

import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { Icon } from '@/components/icon'
import { state } from '@/state'
import chevronLeftIcon from '@iconify/icons-heroicons/chevron-left'
import clsx from 'clsx'

interface BackButtonProps {
  className?: string
}

export function goBack() {
  const entryLength = Number(
    sessionStorage.getItem('entryHistoryLength') ?? window.history.length
  )
  if (window.history.length > entryLength) {
    window.history.back()
  } else {
    window.location.href = '/'
  }
}

export function BackButton({ className }: BackButtonProps) {
  const { ref, inView } = useInView({ initialInView: true })

  useEffect(() => {
    state.pageBackButtonOutOfView = !inView
  }, [inView])

  useEffect(() => {
    return () => {
      state.pageBackButtonOutOfView = false
    }
  }, [])

  return (
    <button
      ref={ref}
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className={clsx(
        'inline-flex items-center justify-center h-[1.2em] w-[1.2em] rounded-md bg-contrast/5 text-contrast/70 hover:text-accent hover:bg-contrast/10 transition-colors cursor-pointer',
        className
      )}
    >
      <Icon
        icon={chevronLeftIcon}
        className="w-[1em] h-[1em]"
      />
    </button>
  )
}
