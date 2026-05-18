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
    <div className="flex">
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
    >
      &copy; {DateTime.now().year} {copyrightName}
    </Paragraph>
  )
}

export function Footer() {
  return (
    <footer className="">
      <Gradient className="relative">
        <div className="absolute inset-2 rounded-4xl bg-body/50 z-0" />
        <Container className="pt-20 z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-y-0 pb-6 lg:gap-24 items-center">
            {/* Center content - first in HTML order, but visually centered on desktop */}
            <div className="flex flex-col items-center lg:order-2">
              <Logo
                className="mb-7"
                width={220}
              />
              <Heading
                as="h4"
                styleAs="h3"
                fontSize="text-lg"
                textAlign="text-center"
                className="italic"
              >
                {description}
              </Heading>
              <SocialLinks />
            </div>

            {/* Left column - second in HTML order, but visually left on desktop */}
            <div className="gap-x-8 lg:order-1">
              <div>
                <ul className="text-center space-y-4 text-xs mb-4 lg:mb-0 mt-20 lg:mt-0">
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
            </div>

            {/* Right column - third in HTML order, visually right on desktop */}
            <div className="gap-x-8 lg:order-3">
              <div>
                <ul className="text-center space-y-4 text-xs">
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
            </div>
          </div>
          <div className="flex justify-center items-center py-6 mt-10 text-center">
            <div>
              <Copyright />
              <Paragraph
                fontSize="text-xs"
                margin="mb-0"
                className="flex items-center justify-center gap-1"
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
