import { useQuery } from '@tanstack/react-query'
import { expressionPickResponseSchema, type ExpressionPickResponse } from '@contracts'
import { apiGet } from './client'

export const PICK_KEY = 'expressions-pick'

export const usePickedExpressions = () =>
  useQuery<ExpressionPickResponse>({
    queryKey: [PICK_KEY],
    queryFn: () => apiGet('/expressions/pick', expressionPickResponseSchema),
  })
