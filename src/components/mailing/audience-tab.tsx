'use client'

import clsx from 'clsx'
import { Span } from '@/components/span'
import { SubscriberTable } from '@/components/subscribers/subscriber-table'
import { plural } from './parts'

export type AudienceChoice = 'all' | 'ticked'

interface AudienceTabProps {
  choice: AudienceChoice
  onChoice: (choice: AudienceChoice) => void
  // How many are subscribed, once known.
  subscribed: number | null
  ticked: Set<number>
  onTicked: (next: Set<number>) => void
  // Opens the Subscribers tab.
  onManage: () => void
  onExpired: () => void
}

const radio =
  'h-4 w-4 shrink-0 appearance-none rounded-full border border-accent checked:bg-accent checked:border-accent focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer'

// Who the campaign goes to: everyone on the mailing list, or only the
// subscribers ticked here, for a test or a small group.
export function AudienceTab({
  choice,
  onChoice,
  subscribed,
  ticked,
  onTicked,
  onManage,
  onExpired,
}: AudienceTabProps) {
  return (
    <div className="flex flex-col gap-3 sm:h-full">
      <fieldset className="flex flex-col gap-2 rounded-md bg-accent/5 p-3">
        <legend className="sr-only">Who it goes to</legend>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="audience"
            checked={choice === 'all'}
            onChange={() => onChoice('all')}
            className={radio}
          />
          <Span fontSize="text-xs">
            <strong>Everyone subscribed</strong>
            {subscribed === null ? '' : ` (${plural(subscribed, 'person')})`}
          </Span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="audience"
            checked={choice === 'ticked'}
            onChange={() => onChoice('ticked')}
            className={radio}
          />
          <Span fontSize="text-xs">
            <strong>Only the subscribers I tick</strong>
            {ticked.size ? ` (${plural(ticked.size, 'person')} ticked)` : ''}
          </Span>
        </label>
      </fieldset>

      <div className={clsx('min-h-0 flex-1', choice === 'all' && 'hidden')}>
        <SubscriberTable
          mode="pick"
          selected={ticked}
          onSelectedChange={onTicked}
          onExpired={onExpired}
        />
      </div>

      <Span fontSize="text-xs" color="text-contrast-light">
        Add people, or unsubscribe them, under{' '}
        <button type="button" onClick={onManage} className="text-accent underline cursor-pointer">
          Subscribers
        </button>
        .
      </Span>
    </div>
  )
}
