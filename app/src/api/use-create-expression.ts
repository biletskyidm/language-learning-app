import { useMutation, useQueryClient } from '@tanstack/react-query'
import { expressionSchema, type CreateExpressionInput, type Expression, type ExpressionListResponse } from '@contracts'
import { apiPost } from './client'
import { EXPRESSIONS_KEY } from './use-expressions'

const isList = (data: unknown): data is ExpressionListResponse =>
  typeof data === 'object' && data !== null && 'items' in data

const OPTIMISTIC_ID = 'optimistic'

const optimistic = (input: CreateExpressionInput): Expression => ({
  ...input,
  id: OPTIMISTIC_ID,
  userId: '',
  createdAt: new Date(),
})

export const useCreateExpression = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateExpressionInput) => apiPost('/expressions', input, expressionSchema),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: [EXPRESSIONS_KEY] })
      const snapshot = queryClient.getQueriesData({ queryKey: [EXPRESSIONS_KEY] })
      queryClient.setQueriesData({ queryKey: [EXPRESSIONS_KEY] }, (data: unknown) =>
        isList(data) ? { items: [optimistic(input), ...data.items] } : data,
      )

      return { snapshot }
    },
    onSuccess: (created) => {
      queryClient.setQueriesData({ queryKey: [EXPRESSIONS_KEY] }, (data: unknown) =>
        isList(data) ? { items: data.items.map((item) => (item.id === OPTIMISTIC_ID ? created : item)) } : data,
      )
      queryClient.setQueryData([EXPRESSIONS_KEY, 'detail', created.id], created)
    },
    onError: (_error, _input, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [EXPRESSIONS_KEY] }),
  })
}
