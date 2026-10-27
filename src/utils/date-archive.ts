import 'server-only'
import { cache } from 'react'
import { dateRange, filterPosts, type FilterResult } from '@/utils/filter-posts'
import { dateArchive, type Archive } from '@/utils/archive-seo'

export const ARCHIVE_PER_PAGE = 15

export type DateArchive = { archive: Archive; result: FilterResult }

// A year's or a month's posts, once for the metadata and the page. A year or
// month with no posts is not a page: the segments match any words, and only
// those with posts are archives.
export const loadDateArchive = cache(
  async (
    year: string,
    month: string | undefined,
    page: number
  ): Promise<DateArchive | null> => {
    if (!dateRange(year, month)) return null
    const result = await filterPosts({
      year,
      ...(month ? { month } : {}),
      page,
      perPage: ARCHIVE_PER_PAGE,
    })
    if (result.total === 0) return null
    return { archive: dateArchive(year, month, result.total), result }
  }
)
