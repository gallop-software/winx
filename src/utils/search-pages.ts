// The pages built into the site are read at build time by
// _scripts/generate-page-metadata.mjs; the WordPress pages come from the
// content index. There are a few dozen in all, so they are matched here
// rather than kept in a search table with the posts.
import pagesData from '@/../_data/_pages.json'
import {
  SNIPPET_MARK_END,
  SNIPPET_MARK_START,
  type SearchHit,
} from '@/utils/content-index'
import { getAllPages } from '@/utils/pages'

type Page = { uri: string; title?: string; description?: string }

function words(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

// The pages in which every word searched for starts a word of the title or
// description, the same rule the posts are matched by.
export async function searchPages(query: string): Promise<SearchHit[]> {
  const wanted = words(query)
  if (!wanted.length) return []

  const pages: Page[] = [
    ...(pagesData as Page[]),
    ...(await getAllPages()).map((page) => ({
      uri: page.path,
      title: page.title,
      description: page.description,
    })),
  ]

  const hits: SearchHit[] = []
  for (const page of pages) {
    if (!page.title) continue
    const description = page.description ?? ''

    const found = words(`${page.title} ${description}`)
    const matches = wanted.every((word, i) =>
      i === wanted.length - 1
        ? found.some((f) => f.startsWith(word))
        : found.includes(word)
    )
    if (!matches) continue

    hits.push({
      url: page.uri,
      title: page.title,
      snippet: (description || page.title).replace(
        /[\p{L}\p{N}]+/gu,
        (word) => {
          const plain = words(word)[0] ?? ''
          const marked = wanted.some((w, i) =>
            i === wanted.length - 1 ? plain.startsWith(w) : plain === w
          )
          return marked
            ? `${SNIPPET_MARK_START}${word}${SNIPPET_MARK_END}`
            : word
        }
      ),
    })
  }
  return hits
}
