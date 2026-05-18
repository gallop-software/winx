import facebookIcon from '@iconify/icons-simple-icons/facebook'
import xIcon from '@iconify/icons-simple-icons/x'
import linkedinIcon from '@iconify/icons-simple-icons/linkedin'
import mailIcon from '@iconify/icons-mdi/email-outline'
import messageIcon from '@iconify/icons-mdi/message-text'
import linkIcon from '@iconify/icons-mdi/link-variant'

export interface ShareTarget {
  label: string
  id: string
  icon: typeof facebookIcon
  color: string
  /** When true, clicking copies the URL instead of navigating. */
  copy?: boolean
  getUrl: (url: string, title: string) => string
}

export const shareTargets: ShareTarget[] = [
  {
    label: 'Share',
    id: 'facebook',
    icon: facebookIcon,
    color: '#3b5998',
    getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    label: 'Post',
    id: 'x',
    icon: xIcon,
    color: '#333333',
    getUrl: (url, title) =>
      `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    label: 'Share',
    id: 'linkedin',
    icon: linkedinIcon,
    color: '#0077b5',
    getUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    label: 'Email',
    id: 'email',
    icon: mailIcon,
    color: '#777777',
    getUrl: (url, title) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
  {
    label: 'Text',
    id: 'sms',
    icon: messageIcon,
    color: '#777777',
    getUrl: (url) => `sms:?&body=${encodeURIComponent(url)}`,
  },
  {
    label: 'Copy',
    id: 'copy',
    icon: linkIcon,
    color: '#555555',
    copy: true,
    getUrl: (url) => url,
  },
]
