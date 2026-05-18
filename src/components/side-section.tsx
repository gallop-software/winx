'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import Link from 'next/link'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Icon } from '@/components/icon'
import { Button } from '@/components/button'
import { Form, FormFirstName, FormLastName, FormInput, FormButton } from '@/components/form'
import { Image } from '@/components/image'
import { Search } from '@/components/search'
import { CategoryDropdown } from '@/components/category-dropdown'
import { Legal } from '@/components/legal'
import LoginDialog from '@/components/login'
import magnifyingGlassIcon from '@iconify/icons-heroicons/magnifying-glass-solid'
import {
  socialLinks,
  editorHeading,
  editorBio,
  editorImage,
  subscribeHeading,
  subscribeIntro,
  subscribeSubheading,
  subscribeDescription,
  subscribeAction,
} from '@/components/footer-3/config'
import type { SocialLink } from '@/components/footer-3/config'

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

function bump(level: HeadingLevel, on: boolean): HeadingLevel {
  if (!on) return level
  const map: Record<HeadingLevel, HeadingLevel> = {
    h1: 'h1',
    h2: 'h1',
    h3: 'h2',
    h4: 'h3',
    h5: 'h4',
    h6: 'h5',
  }
  return map[level]
}

function SocialLinksRow() {
  return (
    <div className="flex flex-wrap items-center gap-0 md:gap-1 justify-start mt-3">
      {socialLinks.map((s: SocialLink) => (
        <a
          key={s.name}
          href={s.href}
          target={s.href.startsWith('http') ? '_blank' : undefined}
          rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          aria-label={s.name}
          className="rounded-lg transition-colors duration-200 p-1 md:p-2 text-accent hover:text-accent-dark hover:bg-contrast-dark/2.5"
        >
          <Icon icon={s.icon} className="w-6 h-6" />
        </a>
      ))}
    </div>
  )
}

function IntroBlock({ isHome }: { isHome: boolean }) {
  return (
    <div className="border border-contrast-light/20 rounded-md p-4">
      <Heading as={bump('h2', isHome)} styleAs="h1" margin="mb-4">
        Founder Notes — Essays on Product, Fundraising, Hiring, and Building a
        Startup
      </Heading>
      <Heading as="h2" styleAs="h2" margin="mb-0">
        For people doing the actual work of building companies.
      </Heading>
      <Paragraph margin="mt-4 mb-8">
        Founder Notes is an independent publication for early-stage founders
        and operators. Long-form thinking on product strategy, fundraising,
        hiring, and the quieter parts of leadership — written from inside the
        work, not above it. One carefully edited essay, every Sunday.{' '}
        <Link
          href="/essays"
          className="text-accent underline"
        >
          Browse the full archive
        </Link>
        .
      </Paragraph>
      <Button href="/essays">Read the latest essays</Button>
    </div>
  )
}

function EditorBlock() {
  return (
    <div className="border border-contrast-light/20 rounded-md p-4">
      <Heading as="h4" styleAs="h2" margin="mb-0">
        {editorHeading}
      </Heading>
      <div className="mt-4">
        <Image
          src={editorImage.src}
          alt={editorImage.alt}
          size="medium"
          rounded="rounded-sm"
          className="w-full max-h-80 object-cover object-top"
        />
      </div>
      <Paragraph margin="mt-4">
        {editorBio}
      </Paragraph>
      <SocialLinksRow />
    </div>
  )
}

function SubscribeBlock() {
  return (
    <div className="border border-contrast-light/20 rounded-md p-4">
      <Heading as="h4" styleAs="h2" margin="mb-0">
        {subscribeHeading}
      </Heading>
      <Paragraph margin="mt-4 mb-4">{subscribeIntro}</Paragraph>
      <Heading as="h3" styleAs="h2" margin="mb-0">
        {subscribeSubheading}
      </Heading>
      <Paragraph margin="mt-4 mb-4">{subscribeDescription}</Paragraph>
      <Form gap="gap-3" honeypot action={subscribeAction}>
        <FormFirstName
          name="firstName"
          placeholder="First name"
          label="First name"
          className="!text-xs !px-3 !py-2 !border"
        />
        <FormLastName
          name="lastName"
          placeholder="Last name"
          label="Last name"
          className="!text-xs !px-3 !py-2 !border"
        />
        <FormInput
          name="email"
          type="email"
          placeholder="Your email address"
          label="Email"
          className="!text-xs !px-3 !py-2 !border"
        />
        <FormButton
          name="submit"
          label="Subscribe for Insights"
          submitMessage="Subscribed successfully."
          className="!text-xs !px-4 !py-2"
        />
      </Form>
    </div>
  )
}

function ExpertiseBlock() {
  return (
    <div className="border border-contrast-light/20 rounded-md p-4">
      <Heading as="h2" styleAs="h2" margin="mb-0">
        About the publication
      </Heading>
      <Paragraph margin="mt-4">
        Founder Notes is written for the people doing the actual work of
        building companies. It&rsquo;s edited like a magazine, paced like a
        Sunday read, and grounded in the day-to-day reality of operating an
        early-stage startup — product, fundraising, hiring, go-to-market, and
        the quieter parts of leadership that rarely make it onto a conference
        stage.
      </Paragraph>
    </div>
  )
}

export function SideSection({
  noPadding = false,
  hideSearch = false,
  hideCategories = false,
  onCategorySelect,
}: {
  noPadding?: boolean
  hideSearch?: boolean
  hideCategories?: boolean
  onCategorySelect?: () => void
} = {}) {
  const [isSearching, setIsSearching] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <aside
      className={clsx(
        'block bg-body2 rounded-md scrollbar-hide',
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
              className="w-full flex items-center gap-2 bg-body text-contrast-light px-3 py-2 text-xs shadow-md rounded-md cursor-pointer text-left"
            >
              <Icon icon={magnifyingGlassIcon} className="w-4 h-4 shrink-0" />
              <span>Search</span>
            </button>
          </>
        )}
        {!hideCategories && (
          <CategoryDropdown
            {...(onCategorySelect ? { onSelect: () => onCategorySelect() } : {})}
          />
        )}
        <IntroBlock isHome={isHome} />
        <EditorBlock />
        <ExpertiseBlock />
        <SubscribeBlock />
        <div className="border border-contrast-light/20 rounded-md p-4 text-left">
          <Legal />
          <div className="mt-3">
            <LoginDialog />
          </div>
        </div>
      </div>
      <Search isOpen={isSearching} setIsOpen={setIsSearching} />
    </aside>
  )
}
