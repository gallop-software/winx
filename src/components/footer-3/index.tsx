import Link from 'next/link'
import { Section } from '@/components/section'
import { Heading } from '@/components/heading'
import { Paragraph } from '@/components/paragraph'
import { Icon } from '@/components/icon'
import { Image } from '@/components/image'
import { Form, FormFirstName, FormLastName, FormInput, FormButton } from '@/components/form'
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
} from './config'
import type { SocialLink } from './config'

function RealtorSection() {
  return (
    <div>
      <Heading
        as="h2"
        styleAs="h5"
        fontSize="text-sm"
        className="tracking-wider"
      >
        {realtorHeading}
      </Heading>
      <div className="flex gap-6 mt-6">
        <Image
          src={realtorImage.src}
          alt={realtorImage.alt}
          size="small"
          rounded="rounded-full"
          className="w-20 h-20 object-cover flex-shrink-0"
        />
        <Paragraph>
          {realtorBio}{' '}
          <Link href={phone.href} className="underline hover:text-contrast-light">
            {phone.display}
          </Link>
          .
        </Paragraph>
      </div>
      <div className="flex gap-3 mt-6">
        {socialLinks.map((s: SocialLink) => (
          <a
            key={s.name}
            href={s.href}
            target={s.href.startsWith('http') ? '_blank' : undefined}
            rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            aria-label={s.name}
            className="rounded-lg transition-colors duration-200 p-2 text-accent hover:text-accent-dark hover:bg-contrast-dark/2.5"
          >
            <Icon icon={s.icon} />
          </a>
        ))}
      </div>
    </div>
  )
}

function SubscribeSection() {
  return (
    <div>
      <Heading
        as="h2"
        styleAs="h5"
        fontSize="text-sm"
        className="tracking-wider"
      >
        {subscribeHeading}
      </Heading>
      <Paragraph margin="mt-6 mb-6">{subscribeIntro}</Paragraph>
      <Heading
        as="h3"
        styleAs="h5"
        fontSize="text-sm"
        className="tracking-wider"
      >
        {subscribeSubheading}
      </Heading>
      <Paragraph margin="mt-6 mb-6">{subscribeDescription}</Paragraph>
      <Form gap="gap-4" honeypot action={subscribeAction}>
        <FormFirstName name="firstName" placeholder="First name" label="First name" />
        <FormLastName name="lastName" placeholder="Last name" label="Last name" />
        <FormInput name="email" type="email" placeholder="Your email address" label="Email" />
        <FormButton
          name="submit"
          label="Subscribe for Insights"
          submitMessage="Subscribed successfully."
        />
      </Form>
    </div>
  )
}

export function Footer3() {
  return (
    <Section className="bg-body2 py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <RealtorSection />
        <SubscribeSection />
      </div>
    </Section>
  )
}
