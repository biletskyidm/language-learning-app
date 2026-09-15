import { useQuery } from '@tanstack/react-query'
import { progressSummarySchema } from '@contracts'
import { apiGet, UnauthorizedError } from './client'

export const useProgressSummary = (enabled = true) =>
  useQuery({
    queryKey: ['progress', 'summary'],
    queryFn: () => apiGet(`/progress/summary?tzOffset=${new Date().getTimezoneOffset()}`, progressSummarySchema),
    retry: (failures, error) => !(error instanceof UnauthorizedError) && failures < 3,
    enabled,
  })
