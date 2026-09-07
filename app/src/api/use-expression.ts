import { useQuery } from '@tanstack/react-query'
import { expressionSchema, type Expression } from '@contracts'
import { apiGet } from './client'
import { EXPRESSIONS_KEY } from './use-expressions'

export const useExpression = (id: string) =>
  useQuery<Expression>({
    queryKey: [EXPRESSIONS_KEY, 'detail', id],
    queryFn: () => apiGet(`/expressions/${id}`, expressionSchema),
  })
