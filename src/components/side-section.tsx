'use client'

import { useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Icon } from '@/components/icon'
import { Button } from '@/components/button'
import { Form, FormFirstName, FormLastName, FormInput, FormButton } from '@/components/form'
import { Image } from '@/components/image'
import { List, Li } from '@/components/list'
import { Span } from '@/components/span'
import { Search } from '@/components/search'
import { CategoryDropdown } from '@/components/category-dropdown'
import { Legal } from '@/components/legal'
import { MemberCard } from '@/components/member-card'
import { useMember } from '@/hooks/use-member'
import magnifyingGlassIcon from '@iconify/icons-heroicons/magnifying-glass-solid'
import {
  editorHeading,
  editorName,
  editorRole,
  editorBio,
  editorImage,
  editorLinkLabel,
  editorLinkHref,
  subscribeHeading,
  subscribeIntro,
  subscribeSubheading,
  subscribeDescription,
  subscribeAction,
  socialLinks,
  externalLinksHeading,
  externalLinks,
} from '@/components/footer/config'
import arrowRightIcon from '@iconify/icons-heroicons/arrow-right'

// Every block takes `onNavigate`, called when a link inside it is followed,
// so a drawer holding the sidebar can close itself. Links that open a new tab
// leave it alone.
type BlockProps = { onNavigate?: (() => void) | undefined }

function IntroBlock({ onNavigate }: BlockProps) {
  return (
    <div className="border border-accent5 shadow-sm rounded-md p-5 bg-body">
      <Heading as="h2" margin="mb-2">
        Founder Notes — Essays on Product, Fundraising, Hiring, and Building a
        Startup
      </Heading>
      <Paragraph margin="mt-4 mb-8">
        Founder Notes is an independent publication for early-stage founders
        and operators. Long-form thinking on product strategy, fundraising,
        hiring, and the quieter parts of leadership — written from inside the
        work, not above it. One carefully edited essay, every Sunday.{' '}
        <Link
          href="/essays"
          onClick={() => onNavigate?.()}
          className="text-accent underline"
        >
          Browse the full archive
        </Link>
        .
      </Paragraph>
      <Button
        href="/#favorite-articles"
        className="w-full"
        // The router skips a link to the address already showing, so a second
        // click would do nothing once the hash is set.
        onClick={() => {
          onNavigate?.()
          document
            .getElementById('favorite-articles')
            ?.scrollIntoView({ behavior: 'smooth' })
        }}
      >
        Read the Latest Essays
      </Button>
    </div>
  )
}

function EditorBlock({ onNavigate }: BlockProps) {
  return (
    <div className="border border-accent5 shadow-sm rounded-md p-5 bg-body">
      <Heading as="h2" margin="mb-2">{editorHeading}</Heading>
      <div className="flex items-center gap-4 mt-4">
        <div className="w-14 h-14 shrink-0 overflow-hidden rounded-full">
          <Image
            src={editorImage.src}
            alt={editorImage.alt}
            size="small"
            rounded="rounded-none"
            className="w-full h-full object-cover object-top"
          />
        </div>
        <div className="flex flex-col">
          <Heading as="h3" margin="mb-0">
            {editorName}
          </Heading>
          <Paragraph margin="mb-0">{editorRole}</Paragraph>
        </div>
      </div>
      <Paragraph margin="mt-4 mb-8">{editorBio}</Paragraph>
      <div className="flex flex-col gap-3">
        <Button
          href={editorLinkHref}
          onClick={() => onNavigate?.()}
          variant="outline"
          icon={arrowRightIcon}
          iconPlacement="after"
          className="w-full"
        >
          {editorLinkLabel}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-5 mt-5">
        {socialLinks.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.name}
            className="text-contrast-light hover:text-accent"
          >
            <Icon icon={s.icon} className="w-5 h-5" />
          </a>
        ))}
      </div>
    </div>
  )
}

function SubscribeBlock({ onNavigate }: BlockProps) {
  const { member, openLogin } = useMember()
  // What the site answered once the form went through. The form is then
  // replaced by it, so nobody sends it twice wondering whether it worked.
  const [sent, setSent] = useState('')
  // A member subscribes with one click on their card instead.
  if (member) return null

  return (
    <div id="subscribe" className="border border-accent5 shadow-sm rounded-md p-5 bg-body">
      <Heading as="h2" margin="mb-2">
        {subscribeHeading}
      </Heading>
      <Paragraph margin="mt-4 mb-8">{subscribeIntro}</Paragraph>
      <Heading as="h3" styleAs="h2" margin="mb-2">
        {subscribeSubheading}
      </Heading>
      <Paragraph margin="mt-4 mb-8">{subscribeDescription}</Paragraph>
      {sent ? (
        <div role="status" className="rounded-md bg-accent px-4 py-3">
          <Paragraph margin="mb-0" color="text-accent-contrast">
            {sent}
          </Paragraph>
        </div>
      ) : (
        <Form
          gap="gap-3"
          honeypot
          action={subscribeAction}
          onSuccess={(data) =>
            setSent(
              typeof data.message === 'string'
                ? data.message
                : 'Check your email for a link to confirm your subscription.'
            )
          }
        >
          <FormFirstName
            name="firstName"
            placeholder="First name"
            label="First name"        />
          <FormLastName
            name="lastName"
            placeholder="Last name"
            label="Last name"        />
          <FormInput
            name="email"
            type="email"
            placeholder="Your email address"
            label="Email"
            autoComplete="email"
            required
          />
          <FormButton
            name="submit"
            label="Subscribe"
            submitMessage="Check your email for a link to confirm your subscription."
            className="!text-xs !px-4 !py-2"
          />
        </Form>
      )}
      <Paragraph fontSize="text-xs" margin="mt-3 mb-0" color="text-contrast-light">
        No account needed. To comment under your own name,{' '}
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            openLogin()
          }}
          className="font-medium text-accent underline cursor-pointer"
        >
          log in or create an account
        </button>
        .
      </Paragraph>
    </div>
  )
}

function ExternalLinksBlock() {
  if (!externalLinks.length) return null
  return (
    <div className="border border-accent5 shadow-sm rounded-md p-5 bg-body">
      <Heading as="h2" margin="mb-2">
        {externalLinksHeading}
      </Heading>
      <List variant="unstyled" spacing="normal" margin="mt-4 mb-0">
        {externalLinks.map((l) => (
          <Li key={l.href}>
            <Link href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label}
            </Link>
            {l.description && (
              <Span color="text-contrast-light" fontSize="text-xs">
                {' '}
                » {l.description}
              </Span>
            )}
          </Li>
        ))}
      </List>
    </div>
  )
}

export function SideSection({
  noPadding = false,
  hideSearch = false,
  hideCategories = false,
  onNavigate,
}: {
  noPadding?: boolean
  hideSearch?: boolean
  hideCategories?: boolean
  // Called when a link in the sidebar is followed, or a dialog opened from
  // it, so a drawer holding the sidebar can close itself.
  onNavigate?: () => void
} = {}) {
  const [isSearching, setIsSearching] = useState(false)

  return (
    <aside
      className={clsx(
        'block bg-body rounded-md scrollbar-hide',
        !noPadding && 'py-7 pl-0 lg:pl-7 pr-7 h-full overflow-y-auto'
      )}
    >
      <div className="flex flex-col gap-4 mx-auto max-w-2xl lg:max-w-none">
        {!hideSearch && (
          <>
            <Heading as="h4" className="sr-only">
              Search Founder Notes
            </Heading>
            <button
              type="button"
              onClick={() => setIsSearching(true)}
              className="w-full flex items-center gap-2 bg-body text-contrast-light px-3 py-2 text-xs border border-accent5 shadow-sm rounded-md cursor-pointer text-left"
            >
              <Icon icon={magnifyingGlassIcon} className="w-4 h-4 shrink-0" />
              <span>Search</span>
            </button>
          </>
        )}
        {!hideCategories && (
          <CategoryDropdown
            {...(onNavigate ? { onSelect: () => onNavigate() } : {})}
          />
        )}
        <IntroBlock onNavigate={onNavigate} />
        <EditorBlock onNavigate={onNavigate} />
        <SubscribeBlock onNavigate={onNavigate} />
        <ExternalLinksBlock />
        <div className="border border-accent5 shadow-sm rounded-md p-5 bg-body text-left">
          <Legal onNavigate={onNavigate} />
        </div>
        <MemberCard onNavigate={onNavigate} />
      </div>
      <Search isOpen={isSearching} setIsOpen={setIsSearching} />
    </aside>
  )
}
