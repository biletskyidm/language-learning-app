import { useQuery } from '@tanstack/react-query'
import { expressionHistoryResponseSchema, type ExpressionHistoryResponse } from '@contracts'
import { apiGet } from './client'
import { EXPRESSIONS_KEY } from './use-expressions'

export const useExpressionHistory = (id?: string) =>
  useQuery<ExpressionHistoryResponse>({
    queryKey: [EXPRESSIONS_KEY, 'history', id],
    queryFn: () => apiGet(`/expressions/${id}/history`, expressionHistoryResponseSchema),
    enabled: id !== undefined,
  })
