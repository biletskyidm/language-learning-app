import { useQuery } from '@tanstack/react-query'
import { expressionTagsResponseSchema, type ExpressionTagsResponse } from '@contracts'
import { apiGet } from './client'

export const EXPRESSION_TAGS_KEY = 'expression-tags'

export const useExpressionTags = () =>
  useQuery<ExpressionTagsResponse>({
    queryKey: [EXPRESSION_TAGS_KEY],
    queryFn: () => apiGet('/expressions/tags', expressionTagsResponseSchema),
  })
