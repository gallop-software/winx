import { NextResponse, type NextRequest } from 'next/server'
import { DateTime } from 'luxon'
import { adminRoute } from '@/utils/mailing-route'
import { exportSubscribers, queryOf } from '@/utils/subscribers'

export const dynamic = 'force-dynamic'

// A value as a spreadsheet reads it: quoted, and never taken for a formula.
function cell(value: string | number | null): string {
  const text = value === null ? '' : String(value)
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

function date(seconds: number | null): string {
  return seconds ? DateTime.fromSeconds(seconds).toISO() ?? '' : ''
}

// The subscribers matching the filter on screen, as a CSV file.
export async function GET(req: NextRequest) {
  return adminRoute(req, async () => {
    const params = req.nextUrl.searchParams
    const rows = await exportSubscribers(
      queryOf({ status: params.get('status'), search: params.get('search') })
    )

    const lines = [
      ['email', 'first_name', 'last_name', 'status', 'source', 'added', 'confirmed', 'unsubscribed']
        .map(cell)
        .join(','),
      ...rows.map((row) =>
        [
          row.email,
          row.firstName,
          row.lastName,
          row.status,
          row.source,
          date(row.createdAt),
          date(row.confirmedAt),
          date(row.unsubscribedAt),
        ]
          .map(cell)
          .join(',')
      ),
    ]

    return new NextResponse(`${lines.join('\r\n')}\r\n`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="subscribers-${DateTime.now().toISODate()}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  })
}
