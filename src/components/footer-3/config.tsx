import emailIcon from '@iconify/icons-mdi/email-outline'
import facebookIcon from '@iconify/icons-mdi/facebook'
import instagramIcon from '@iconify/icons-mdi/instagram'
import phoneIcon from '@iconify/icons-mdi/phone'
import youtubeIcon from '@iconify/icons-mdi/youtube'

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
  display: '214.522.1000',
  href: 'tel:214.522.1000',
}

export const socialLinks: SocialLink[] = [
  { name: 'Facebook', href: 'https://www.facebook.com/douglasnewby', icon: facebookIcon },
  { name: 'Instagram', href: 'https://www.instagram.com/douglasnewby/', icon: instagramIcon },
  { name: 'YouTube', href: 'https://www.youtube.com/c/ArchitecturallySignificantHomes', icon: youtubeIcon },
  { name: 'Phone', href: phone.href, icon: phoneIcon },
  { name: 'Email', href: 'mailto:dnewby@dougnewby.com', icon: emailIcon },
]

export const realtorHeading = 'Realtor Douglas Newby'

export const realtorBio =
  'Douglas Newby understands the economic and aesthetic impact of homes and neighborhoods that make us happy better than anyone in the county. I hope you enjoy my thoughts on architecture, home, desirable sites, neighborhoods, and the evolution of cities. Ultimately what is most important is a home that make you happy. If you have an interest in buying or selling a home or questions about the evolution of Dallas, call me at'

export const realtorImage = {
  src: '/megan-and-bryan-fears-with-doug-750x750.jpg',
  alt: 'Megan and Bryan Fears with Douglas Newby',
}

export const subscribeHeading =
  'Dallas Broker for Architecturally Significant Homes'

export const subscribeIntro = (
  <>
    Douglas Newby created the concept of architecturally significant homes and
    has registered trademark <em>Architecturally Significant&reg;</em> and{' '}
    <em>Architecturally Significant Homes&reg;</em>.
  </>
)

export const subscribeSubheading =
  'Follow or Subscribe for Insights from Dallas Real Estate Broker Douglas Newby'

export const subscribeDescription =
  'Douglas Newby provides insights and interprets neighborhoods, real estate, architecture, and the market, when other agents provide ubiquitous statistics.'

export const subscribeAction = '/api/subscribe/'

export const trademarkLinks: TrademarkLink[] = [
  { label: 'Architecturally Significant Homes', href: 'https://dougnewby.com' },
  { label: 'Significant Homes', href: 'https://dougnewby.com' },
  {
    label: 'Architecturally Significant',
    href: 'https://dougnewby.com/architecture/architecturally-significant-homes/',
  },
]

export const businessAddress =
  'Douglas Newby & Associates | 4514 Cole Avenue Suite 600, Dallas, TX 75205'

export const copyrightYears = '1994–2026'
export const copyrightName = 'Douglas Newby'

export const webmaster = {
  label: 'webplant.media',
  href: 'https://webplant.media',
}
