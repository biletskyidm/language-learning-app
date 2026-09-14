import { useQuery } from '@tanstack/react-query'
import { expressionPickResponseSchema, type ExpressionPickResponse } from '@contracts'
import { apiGet } from './client'

export const PICK_KEY = 'expressions-pick'

export const usePickedExpressions = (limit: number | undefined) =>
  useQuery<ExpressionPickResponse>({
    queryKey: [PICK_KEY, limit],
    queryFn: () => apiGet(`/expressions/pick?limit=${limit}`, expressionPickResponseSchema),
    enabled: limit !== undefined,
  })
