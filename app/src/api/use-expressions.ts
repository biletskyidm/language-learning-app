import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { expressionListResponseSchema, type ExpressionListResponse } from '@contracts'
import { apiGet } from './client'
import { DEFAULT_FILTERS, filtersToQuery, type ExpressionFilters } from './expression-filters'

export const EXPRESSIONS_KEY = 'expressions'
export const SEARCH_DEBOUNCE_MS = 300

const useDebounced = (value: string, ms: number) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])

  return debounced
}

export const useExpressions = (filters: ExpressionFilters = DEFAULT_FILTERS) => {
  // Only typing is debounced; tapping a chip should feel immediate.
  const search = useDebounced(filters.search.trim(), SEARCH_DEBOUNCE_MS)
  const path = `/expressions${filtersToQuery({ ...filters, search })}`

  return useQuery<ExpressionListResponse>({
    queryKey: [EXPRESSIONS_KEY, path],
    queryFn: () => apiGet(path, expressionListResponseSchema),
    // Keeps the previous page of rows on screen while a new search is in flight.
    placeholderData: (previous) => previous,
  })
}
