import type { ReactElement } from 'react'
import clsx from 'clsx'
import { Icon } from '@/components/icon'
import { socialLinks } from './config'
import type { SocialLink } from './types'

/**
 * Social media navigation component
 * Renders social media icons for desktop view
 * @returns {ReactElement} Social media links
 */
export function SocialMediaNav({
  dark = false,
}: { dark?: boolean } = {}): ReactElement {
  return (
    <div className="hidden lg:flex items-center space-x-0 xl:space-x-1">
      {socialLinks.map((item: SocialLink) => (
        <a
          key={item.name}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            'rounded-lg transition-colors duration-200 p-2',
            dark
              ? 'text-body hover:text-body/80 hover:bg-body/10'
              : 'text-accent hover:text-accent-dark hover:bg-contrast-dark/2.5'
          )}
          aria-label={item.name}
        >
          <Icon icon={item.icon} />
        </a>
      ))}
    </div>
  )
}
