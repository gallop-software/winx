import { Container } from '@/components/container'
import { Gradient } from '@/components/gradient'
import { Logo } from '@/components/logo'
import Link from 'next/link'
import { Icon } from '@/components/icon'
import { Paragraph } from '@/components/paragraph'
import { Heading } from '@/components/heading'
import { DateTime } from 'luxon'
import {
  socialLinks,
  leftColumn,
  rightColumn,
  description,
  copyrightName,
  WebMaster,
} from './config'
import type { FooterLink, SocialLink } from './config'

function SocialLinks() {
  return (
    <div className="flex justify-center md:justify-start">
      {socialLinks.map((item: SocialLink) => (
        <a
          key={item.name}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-dark hover:bg-body2/30 rounded-lg transition-colors duration-200 p-2"
          aria-label={item.name}
        >
          <Icon
            icon={item.icon}
            className="h-7 w-7"
          />
        </a>
      ))}
    </div>
  )
}

function Copyright() {
  return (
    <Paragraph
      fontSize="text-xs"
      margin="mb-0"
      textAlign="text-center lg:text-left"
    >
      &copy; {DateTime.now().year} {copyrightName}
    </Paragraph>
  )
}

export function Footer2() {
  return (
    <footer className="">
      <Gradient className="relative">
        <div className="absolute inset-2 rounded-4xl bg-body/50 z-0" />
        <Container className="pt-16 pb-0 z-10 relative">
          {/* Main footer content - 4 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[35%_1fr_1fr_1fr] gap-12 lg:gap-12 pb-12">
            {/* Column 1: Logo and Description */}
            <div className="flex flex-col items-center md:items-start">
              <Logo
                className="mb-6"
                width={180}
              />
              <Paragraph
                fontSize="text-xs"
                margin="mb-4"
                textAlign="text-center md:text-left"
              >
                {description}
              </Paragraph>
              <SocialLinks />
            </div>

            {/* Column 2: Menu */}
            <div>
              <Heading
                as="h4"
                fontSize="text-base"
                margin="mb-6"
                textAlign="text-center md:text-left"
              >
                Menu
              </Heading>
              <ul className="space-y-3 text-xs text-center md:text-left">
                {leftColumn.map((link: FooterLink) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-medium text-contrast hover:text-contrast-light"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Our Services */}
            <div>
              <Heading
                as="h4"
                fontSize="text-base"
                margin="mb-6"
                textAlign="text-center md:text-left"
              >
                Our Services
              </Heading>
              <ul className="space-y-3 text-xs text-center md:text-left">
                {rightColumn.map((link: FooterLink) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-medium text-contrast hover:text-contrast-light"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div className="">
              <Heading
                as="h4"
                fontSize="text-base"
                margin="mb-6"
                textAlign="text-center md:text-left"
              >
                Contact
              </Heading>
              <ul className="space-y-3 text-xs text-center md:text-left">
                {socialLinks.map((item: SocialLink) => (
                  <li
                    key={item.name}
                    className="flex items-center gap-2 justify-center md:justify-start"
                  >
                    <Icon
                      icon={item.icon}
                      className="h-5 w-5 shrink-0"
                    />
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-contrast hover:text-contrast-light"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar with copyright and webmaster */}
          <div className="border-t border-accent/10 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-center lg:gap-4">
              <Copyright />
              <Paragraph
                fontSize="text-xs"
                margin="mb-0"
                className="flex items-center justify-center lg:justify-end gap-1"
              >
                <WebMaster />
              </Paragraph>
            </div>
          </div>
        </Container>
      </Gradient>
    </footer>
  )
}
