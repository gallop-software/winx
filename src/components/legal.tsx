import { Fragment } from 'react'
import Link from 'next/link'
import { Paragraph } from '@/components/paragraph'
import {
  footerLinks,
  publisher,
  copyrightYears,
  copyrightName,
  webmaster,
  template,
} from '@/components/footer/config'
import type { FooterLink } from '@/components/footer/config'

export function Legal({ onNavigate }: { onNavigate?: (() => void) | undefined } = {}) {
  return (
    <>
      <Paragraph fontSize="text-xs" margin="mb-4" textAlign="text-left">
        &copy; {copyrightYears} {copyrightName}. Edited by {copyrightName} for{' '}
        {publisher}, which is the owner and publisher of this site.{' '}
        {footerLinks.map((t: FooterLink, i: number) => (
          <Fragment key={t.label}>
            {i > 0 && ' | '}
            <Link
              href={t.href}
              onClick={() => onNavigate?.()}
              className="underline hover:text-contrast-light"
            >
              {t.label}
            </Link>
          </Fragment>
        ))}
      </Paragraph>
      <Paragraph fontSize="text-xs" margin="mb-0" textAlign="text-left">
        Website design and development by{' '}
        <a
          href={webmaster.href}
          target="_blank"
          rel="noopener"
          className="underline hover:text-contrast-light"
        >
          {webmaster.label}
        </a>
        , built on{' '}
        <a
          href={template.href}
          target="_blank"
          rel="noopener"
          className="underline hover:text-contrast-light"
        >
          {template.label}
        </a>
      </Paragraph>
    </>
  )
}
