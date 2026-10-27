import type { NextRequest } from 'next/server'
import { RECIPIENTS_PER_PAGE, deleteDraft, getCampaign, listRecipients } from '@/utils/mailing'
import { adminRoute, positiveInteger, problem, reply } from '@/utils/mailing-route'
import type { RecipientFilter, RecipientSort } from '@/utils/mailing-types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const FILTERS: RecipientFilter[] = [
  'all',
  'delivered',
  'opened',
  'clicked',
  'unopened',
  'bounced',
  'unsubscribed',
  'complained',
  'failed',
  'skipped',
  'queued',
]
const SORTS: RecipientSort[] = ['name', 'email', 'status', 'opens', 'clicks', 'activity']

// One campaign's report: its totals, and a page of the people it went to
// with what each of them did.
export async function GET(req: NextRequest, { params }: Params) {
  return adminRoute(req, async () => {
    const id = positiveInteger((await params).id)
    const campaign = id ? await getCampaign(id) : null
    if (!id || !campaign) return problem('That campaign was not found.', 404)

    const query = req.nextUrl.searchParams
    const recipients = await listRecipients(id, {
      filter: FILTERS.find((filter) => filter === query.get('filter')) ?? 'all',
      search: (query.get('search') ?? '').slice(0, 100),
      sort: SORTS.find((sort) => sort === query.get('sort')) ?? 'activity',
      descending: query.get('dir') !== 'asc',
      page: positiveInteger(query.get('page') ?? '1') ?? 1,
    })

    return reply({ campaign, ...recipients, perPage: RECIPIENTS_PER_PAGE })
  })
}

// Removes a campaign that was made and never sent.
export async function DELETE(req: NextRequest, { params }: Params) {
  return adminRoute(req, async () => {
    const id = positiveInteger((await params).id)
    if (!id) return problem('That campaign was not found.', 404)
    return (await deleteDraft(id))
      ? reply({ deleted: true })
      : problem('Only a campaign that has not been sent can be removed.', 409)
  })
}
