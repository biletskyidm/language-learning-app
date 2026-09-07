import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { expressionListResponseSchema, type ExpressionListResponse } from '@contracts'
import { apiGet } from './client'

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

export const useExpressions = (search = '') => {
  const debounced = useDebounced(search.trim(), SEARCH_DEBOUNCE_MS)

  return useQuery<ExpressionListResponse>({
    queryKey: [EXPRESSIONS_KEY, debounced],
    queryFn: () =>
      apiGet(
        `/expressions${debounced ? `?search=${encodeURIComponent(debounced)}` : ''}`,
        expressionListResponseSchema,
      ),
    // Keeps the previous page of rows on screen while a new search is in flight.
    placeholderData: (previous) => previous,
  })
}
