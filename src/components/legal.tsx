import Link from 'next/link'
import { Paragraph } from '@/components/paragraph'
import {
  trademarkLinks,
  phone,
  businessAddress,
  copyrightYears,
  copyrightName,
} from '@/components/footer/config'
import type { TrademarkLink } from '@/components/footer/config'

export function Legal() {
  return (
    <Paragraph fontSize="text-xs" margin="mb-0" textAlign="text-left">
      {trademarkLinks.map((t: TrademarkLink, i: number) => (
        <span key={t.label}>
          {i > 0 && ' and '}
          <a
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-contrast-light"
          >
            {t.label}
          </a>
          &reg;
        </span>
      ))}{' '}
      are registered in the US Patent and Trademark Office. Text, Images,
      Photography - Copyright &copy; {copyrightYears} {copyrightName}. All
      rights reserved. The material on this site may not be reproduced,
      distributed, transmitted, cached or otherwise used, except with the prior
      written permission of {copyrightName}. {businessAddress} |{' '}
      <Link href={phone.href} className="underline hover:text-contrast-light">
        ({phone.display.split('.')[0]}) {phone.display.split('.').slice(1).join('-')}
      </Link>
      . Text, Images, Photography - Copyright &copy; {copyrightYears}{' '}
      {copyrightName}. All Rights Reserved.
    </Paragraph>
  )
}
