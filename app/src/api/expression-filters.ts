import {
  expressionSortSchema,
  frequencySchema,
  sortDirectionSchema,
  type ExpressionSort,
  type Frequency,
  type SortDirection,
} from '@contracts'
import type { ZodType } from 'zod'

export type ExpressionFilters = {
  search: string
  tag?: string
  frequency?: Frequency
  due: boolean
  sort: ExpressionSort
  dir: SortDirection
}

export const DEFAULT_FILTERS: ExpressionFilters = { search: '', due: false, sort: 'createdAt', dir: 'desc' }

export type RouteParams = Record<string, string | string[] | undefined>

const single = (value: string | string[] | undefined) => {
  const first = Array.isArray(value) ? value[0] : value
  return first ? first : undefined
}

const known = <T>(schema: ZodType<T>, value: string | undefined): T | undefined => {
  const parsed = schema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export const filtersFromParams = (params: RouteParams): ExpressionFilters => ({
  search: single(params.search) ?? '',
  tag: single(params.tag),
  frequency: known(frequencySchema, single(params.frequency)),
  due: single(params.due) === 'true',
  sort: known(expressionSortSchema, single(params.sort)) ?? DEFAULT_FILTERS.sort,
  dir: known(sortDirectionSchema, single(params.dir)) ?? DEFAULT_FILTERS.dir,
})

export const filtersToParams = (filters: ExpressionFilters): Record<string, string> => ({
  search: filters.search,
  tag: filters.tag ?? '',
  frequency: filters.frequency ?? '',
  due: filters.due ? 'true' : '',
  sort: filters.sort,
  dir: filters.dir,
})

export const filtersToQuery = (filters: ExpressionFilters): string => {
  const parts: string[] = []
  const add = (key: string, value?: string) => {
    if (value) parts.push(`${key}=${encodeURIComponent(value)}`)
  }

  add('search', filters.search.trim())
  add('tag', filters.tag)
  add('frequency', filters.frequency)
  if (filters.due) parts.push('due=true')
  if (filters.sort !== DEFAULT_FILTERS.sort) add('sort', filters.sort)
  if (filters.dir !== DEFAULT_FILTERS.dir) add('dir', filters.dir)

  return parts.length ? `?${parts.join('&')}` : ''
}

export const isFiltered = (filters: ExpressionFilters): boolean =>
  Boolean(filters.tag || filters.frequency || filters.due)
