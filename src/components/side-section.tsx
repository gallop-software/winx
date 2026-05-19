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
import { Search } from '@/components/search'
import { CategoryDropdown } from '@/components/category-dropdown'
import { Legal } from '@/components/legal'
import LoginDialog from '@/components/login'
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
} from '@/components/footer-3/config'
import arrowRightIcon from '@iconify/icons-heroicons/arrow-right'

function IntroBlock() {
  return (
    <div className="border border-accent5 shadow-sm rounded-md p-5 bg-body">
      <Heading as="h2">
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
          className="text-accent underline"
        >
          Browse the full archive
        </Link>
        .
      </Paragraph>
      <Button href="/#favorite-articles" className="w-full">Read the Latest Essays</Button>
    </div>
  )
}

function EditorBlock() {
  return (
    <div className="border border-accent5 shadow-sm rounded-md p-5 bg-body">
      <Heading as="h2">{editorHeading}</Heading>
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
      <Button
        href={editorLinkHref}
        variant="outline"
        icon={arrowRightIcon}
        iconPlacement="after"
        className="w-full"
      >
        {editorLinkLabel}
      </Button>
    </div>
  )
}

function SubscribeBlock() {
  return (
    <div className="border border-accent5 shadow-sm rounded-md p-5 bg-body">
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
          label="First name"        />
        <FormLastName
          name="lastName"
          placeholder="Last name"
          label="Last name"        />
        <FormInput
          name="email"
          type="email"
          placeholder="Your email address"
          label="Email"        />
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
            {...(onCategorySelect ? { onSelect: () => onCategorySelect() } : {})}
          />
        )}
        <IntroBlock />
        <EditorBlock />
        <SubscribeBlock />
        <div className="border border-accent5 shadow-sm rounded-md p-5 bg-body text-left">
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
