import emailIcon from '@iconify/icons-mdi/email-outline'
import facebookIcon from '@iconify/icons-mdi/facebook'
import instagramIcon from '@iconify/icons-mdi/instagram'
import linkedinIcon from '@iconify/icons-mdi/linkedin'
import twitterIcon from '@iconify/icons-mdi/twitter'

export interface SocialLink {
  name: string
  href: string
  icon: { body: string; width?: number; height?: number }
}

export interface TrademarkLink {
  label: string
  href: string
}

export const phone = {
  display: '555.123.4567',
  href: 'tel:555.123.4567',
}

export const socialLinks: SocialLink[] = [
  { name: 'Twitter', href: 'https://twitter.com/winx', icon: twitterIcon },
  { name: 'LinkedIn', href: 'https://linkedin.com/winx', icon: linkedinIcon },
  { name: 'Instagram', href: 'https://instagram.com/winx', icon: instagramIcon },
  { name: 'Facebook', href: 'https://facebook.com/winx', icon: facebookIcon },
  { name: 'Email', href: 'mailto:me@your-company.com', icon: emailIcon },
]

export const editorHeading = 'About the Editor'

export const editorName = 'Nathan Baugh'

export const editorRole = 'Operator. Investor. Writer.'

export const editorBio =
  'I write about building, scaling, and leading companies. Previously founded an enterprise SaaS company and invested in early-stage startups.'

export const editorLinkLabel = 'More about Nathan'

export const editorLinkHref = '/about'

export const editorImage = {
  src: '/pexels-maide-arslan-128712163-31750448.jpg',
  alt: 'Founder Notes editor',
}

export const subscribeHeading =
  'One founder essay. Every Sunday.'

export const subscribeIntro = (
  <>
    Join thousands of operators reading <em>Founder Notes</em> each week. No
    threads, no upsells, no sponsored takes — just one carefully written piece
    on building, hiring, raising, or leading.
  </>
)

export const subscribeSubheading =
  'Subscribe for the weekly read'

export const subscribeDescription =
  'Long-form thinking on the decisions that actually shape a company — from the first hire to the Series A and everything that breaks along the way.'

export const subscribeAction = '/api/subscribe/'

export const trademarkLinks: TrademarkLink[] = [
  { label: 'Essays', href: '/essays' },
  { label: 'Newsletter', href: '/#newsletter' },
  { label: 'About', href: '/about' },
]

export const businessAddress =
  'Founder Notes — Essays on building companies that matter.'

export const copyrightYears = '2020–2026'
export const copyrightName = 'Founder Notes'

export const webmaster = {
  label: 'webplant.media',
  href: 'https://webplant.media',
}
