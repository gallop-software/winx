import FlexSearch from 'flexsearch'

let sectionIndex: any = null
let searchData: any[] = []

async function loadSearchData(): Promise<any[]> {
  if (searchData.length === 0) {
    const response = await fetch('/search-index.json')
    searchData = await response.json()
  }
  return searchData
}

async function getIndex(): Promise<any> {
  if (!sectionIndex) {
    const data = await loadSearchData()

    sectionIndex = new FlexSearch.Document({
      tokenize: 'full',
      document: {
        id: 'url',
        index: 'content',
        store: ['title', 'pageTitle', 'content'],
      },
      context: { resolution: 9, depth: 2, bidirectional: true },
    })

    // Add all data to the index
    for (let item of data) {
      sectionIndex.add({
        url: item.url,
        title: item.title,
        content: item.content,
        pageTitle: item.pageTitle || '',
      })
    }
  }
  return sectionIndex
}

export interface Result {
  url: string
  title: string
  pageTitle?: string
  content?: string
  isViewAll?: boolean
  [key: string]: any
}

export async function search(
  query: string,
  options: { limit?: number } = {}
): Promise<Result[]> {
  const index = await getIndex()
  const result = index.search(query, { ...options, enrich: true })
  if (result.length === 0) return []

  return result[0].result.map((r: any) => ({
    url: r.id,
    title: r.doc.title,
    pageTitle: r.doc.pageTitle,
    content: r.doc.content || '',
  }))
}
