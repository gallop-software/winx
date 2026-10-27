import type { ViewListRow } from '@/utils/page-view-types'
import type { ListRow } from './view-list'

// Referrers arrive as host names, or as an Android app's package name. This
// gives the well-known ones the name people know them by, and folds the
// search engines into one line that opens to show each.

const NAMES: Record<string, string> = {
  'mail.google.com': 'Gmail',
  'com.google.android.gm': 'Gmail (Android app)',
  'scholar.google.com': 'Google Scholar',
  'news.google.com': 'Google News',
  'gemini.google.com': 'Gemini',
  'facebook.com': 'Facebook',
  'm.facebook.com': 'Facebook',
  'l.facebook.com': 'Facebook',
  'lm.facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'l.instagram.com': 'Instagram',
  'twitter.com': 'X (Twitter)',
  'x.com': 'X (Twitter)',
  't.co': 'X (Twitter)',
  'linkedin.com': 'LinkedIn',
  'lnkd.in': 'LinkedIn',
  'reddit.com': 'Reddit',
  'old.reddit.com': 'Reddit',
  'out.reddit.com': 'Reddit',
  'com.reddit.frontpage': 'Reddit (Android app)',
  'youtube.com': 'YouTube',
  'm.youtube.com': 'YouTube',
  'news.ycombinator.com': 'Hacker News',
  'bsky.app': 'Bluesky',
  'pinterest.com': 'Pinterest',
  'mail.yahoo.com': 'Yahoo Mail',
  'outlook.live.com': 'Outlook',
  'chatgpt.com': 'ChatGPT',
  'perplexity.ai': 'Perplexity',
  'claude.ai': 'Claude',
  'copilot.microsoft.com': 'Copilot',
}

// Checked after NAMES, so that Gmail and Google Scholar are not taken for
// the search engine they share a name with.
const SEARCH_ENGINES: [RegExp, string][] = [
  [/^google\.(com|[a-z]{2,3}|com?\.[a-z]{2})$/, 'Google'],
  [/^com\.google\.android\.googlequicksearchbox$/, 'Google (Android app)'],
  [/^(.+\.)?bing\.com$/, 'Bing'],
  [/^(.+\.)?duckduckgo\.com$/, 'DuckDuckGo'],
  [/^(.+\.)?search\.yahoo\.com$|^yahoo\.com$/, 'Yahoo'],
  [/^(.+\.)?baidu\.com$/, 'Baidu'],
  [/^(.+\.)?yandex\.[a-z.]+$/, 'Yandex'],
  [/^(.+\.)?ecosia\.org$/, 'Ecosia'],
  [/^search\.brave\.com$/, 'Brave Search'],
  [/^(.+\.)?startpage\.com$/, 'Startpage'],
  [/^(.+\.)?kagi\.com$/, 'Kagi'],
  [/^(.+\.)?qwant\.com$/, 'Qwant'],
]

function mostFirst(rows: ListRow[]): ListRow[] {
  return rows.sort((a, b) => b.views - a.views || a.label.localeCompare(b.label))
}

// Rows that share a name become one, with their views added up: Facebook is
// one line whether the link was opened on a phone or not.
function merged(rows: { name: string; host: string; views: number }[]): ListRow[] {
  const byName = new Map<string, ListRow>()
  for (const row of rows) {
    const known = byName.get(row.name)
    if (known) {
      known.views += row.views
      known.hint = `${known.hint}, ${row.host}`
    } else {
      byName.set(row.name, { key: row.name, label: row.name, views: row.views, hint: row.host })
    }
  }
  return mostFirst([...byName.values()])
}

export function nameReferrers(rows: ViewListRow[]): ListRow[] {
  const engines: { name: string; host: string; views: number }[] = []
  const others: { name: string; host: string; views: number }[] = []

  for (const row of rows) {
    const host = row.key
    const known = NAMES[host]
    const engine = known ? undefined : SEARCH_ENGINES.find(([pattern]) => pattern.test(host))
    if (engine) engines.push({ name: engine[1], host, views: row.views })
    else others.push({ name: known ?? host, host, views: row.views })
  }

  const named = merged(others)
  if (!engines.length) return named

  const members = merged(engines)
  return mostFirst([
    ...named,
    {
      key: 'search-engines',
      label: 'Search engines',
      views: members.reduce((sum, member) => sum + member.views, 0),
      members,
    },
  ])
}
