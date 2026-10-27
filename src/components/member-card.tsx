'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import userCircleIcon from '@iconify/icons-heroicons/user-circle'
import checkCircleIcon from '@iconify/icons-heroicons/check-circle'
import wordpressIcon from '@iconify/icons-mdi/wordpress'
import { Button } from '@/components/button'
import { Icon } from '@/components/icon'
import { Paragraph } from '@/components/paragraph'
import { QuietButton } from '@/components/quiet-button'
import { Span } from '@/components/span'
import { useMember } from '@/hooks/use-member'
import { state } from '@/state'
import type { Member } from '@/utils/member-types'

const wordPressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL ?? ''

// WordPress opens beside the site, not in place of it.
function openWordPress(path: string) {
  window.open(`${wordPressUrl}${path}`, '_blank', 'noopener,noreferrer')
}

// The bottom of the sidebar: a Log in button, or the member's card. An
// administrator's card also links to WordPress, which asks for its own login.
// `onNavigate` is called before anything that leaves the card behind (a page,
// the login dialog), so a drawer holding the card can close itself.
export function MemberCard({
  onNavigate,
}: { onNavigate?: (() => void) | undefined } = {}) {
  const { member, loaded, logOut, openLogin } = useMember()
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const router = useRouter()

  // Reserves the space until the answer is in, so the sidebar does not jump.
  if (!loaded)
    return (
      <div
        className="h-10"
        aria-hidden="true"
      />
    )

  if (!member) {
    return (
      <Button
        onClick={() => {
          onNavigate?.()
          openLogin()
        }}
        icon={userCircleIcon}
        iconPlacement="before"
        className="w-full !text-xs !px-4 !py-2"
      >
        Log in
      </Button>
    )
  }

  // One click on the card, either way: the switch on the profile page does
  // the same.
  const setSubscribed = async (subscribed: boolean) => {
    if (saving) return
    setSaving(true)
    try {
      const response = await fetch('/api/account/profile/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribed: subscribed ? 'true' : 'false' }),
      })
      const data = (await response.json()) as {
        member?: Member
        message?: string
      }
      if (response.ok && data.member) {
        state.member = data.member
        setNotice(data.message ?? '')
      } else if (response.status === 401) await logOut()
    } catch {
      // Left as it was.
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-accent5 shadow-sm rounded-md p-5 bg-body">
      <div className="flex items-center gap-3">
        {member.avatar ? (
          <img
            src={member.avatar}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-full shrink-0"
          />
        ) : (
          <Icon
            icon={userCircleIcon}
            className="h-12 w-12 text-contrast/40 shrink-0"
          />
        )}
        <div className="min-w-0">
          <Paragraph
            margin="mb-1"
            fontWeight="font-semibold"
            className="truncate"
          >
            {member.name}
          </Paragraph>
          {member.subscribed ? (
            <Span
              fontSize="text-xs"
              fontWeight="font-medium"
              color="text-accent"
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5"
            >
              <Icon
                icon={checkCircleIcon}
                className="w-3.5 h-3.5"
              />
              Subscribed
            </Span>
          ) : (
            <Span
              fontSize="text-xs"
              fontWeight="font-medium"
              color="text-contrast-light"
              className="inline-flex items-center rounded-full bg-body2 px-2.5 py-0.5"
            >
              Not subscribed
            </Span>
          )}
        </div>
      </div>
      <Paragraph
        fontSize="text-xs"
        color="text-contrast-light"
        margin="mt-4 mb-3"
      >
        {member.subscribed
          ? 'You get each new essay by email. Unsubscribe any time; your account stays.'
          : 'Get each new essay by email as it is published, about one a week.'}
      </Paragraph>
      {notice && (
        <Paragraph
          fontSize="text-xs"
          color="text-accent"
          margin="mb-3"
          role="status"
        >
          {notice}
        </Paragraph>
      )}
      <div className="flex flex-col gap-3">
        {member.subscribed ? (
          <QuietButton
            onClick={() => setSubscribed(false)}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Unsubscribe'}
          </QuietButton>
        ) : (
          <Button
            onClick={() => setSubscribed(true)}
            className="w-full !text-xs !px-4 !py-2"
          >
            {saving ? 'Saving…' : 'Subscribe'}
          </Button>
        )}
        <QuietButton
          onClick={() => {
            onNavigate?.()
            router.push('/account/')
          }}
        >
          Edit profile
        </QuietButton>
        {member.isAdmin && wordPressUrl && (
          <QuietButton
            onClick={() => openWordPress('/wp-admin/')}
            className="gap-2"
          >
            <Icon
              icon={wordpressIcon}
              className="w-4 h-4"
            />
            Dashboard
          </QuietButton>
        )}
        <QuietButton onClick={logOut}>Log out</QuietButton>
      </div>
    </div>
  )
}
