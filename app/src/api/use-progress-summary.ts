import { useQuery } from '@tanstack/react-query'
import { progressSummarySchema } from '@contracts'
import { apiGet } from './client'

export const useProgressSummary = (enabled = true) =>
  useQuery({
    queryKey: ['progress', 'summary'],
    queryFn: () => apiGet(`/progress/summary?tzOffset=${new Date().getTimezoneOffset()}`, progressSummarySchema),
    enabled,
  })
