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
  phone,
  realtorHeading,
  realtorBio,
  realtorImage,
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
        Douglas Newby insights on Architecturally Significant Homes,
        Neighborhoods, and the Evolution of Cities
      </Heading>
      <Heading as="h2" styleAs="h2" margin="mb-0">
        Impact on Homes That Make Us Happy
      </Heading>
      <Paragraph margin="mt-4 mb-8">
        Douglas Newby is a national award-winning realtor who identifies
        architectural significance, value, and homes that make people happy.
        Insights offered in these articles include the nuance and evolution of
        neighborhoods, cities and Dallas. If you are interested in purchasing
        an Architecturally Significant Home, go to{' '}
        <Link
          href="https://dougnewby.com/"
          className="text-accent underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Douglas Newby &amp; Associates real estate site DougNewby.com
        </Link>
        .
      </Paragraph>
      <Button href="https://dougnewby.com/">Architecturally Significant Homes</Button>
    </div>
  )
}

function RealtorBlock() {
  return (
    <div className="border border-contrast-light/20 rounded-md p-4">
      <Heading as="h4" styleAs="h2" margin="mb-0">
        {realtorHeading}
      </Heading>
      <div className="mt-4">
        <Image
          src={realtorImage.src}
          alt={realtorImage.alt}
          size="medium"
          rounded="rounded-sm"
          className="w-full h-auto"
        />
      </div>
      <Paragraph margin="mt-4">
        {realtorBio}{' '}
        <Link href={phone.href} className="underline hover:text-contrast-light">
          {phone.display}
        </Link>
        .
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
        Douglas Newby Expertise
      </Heading>
      <Paragraph margin="mt-4">
        A life long curiosity and interest in art, culture and economics, and
        how they impact homes, neighborhoods and cities shape the prescient
        understanding Douglas Newby has for evolving real estate markets. His
        uncanny ability to see which homes and neighborhoods thrive and which
        will lag and when has been immensely beneficial to his clients and to
        the city. Ultimately, what is most important is homes that make us
        happy.
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
              Search Douglas Newby Blog Articles
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
        <RealtorBlock />
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
