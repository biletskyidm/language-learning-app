import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ExpressionListResponse } from '@contracts'
import { apiDelete } from './client'
import { EXPRESSIONS_KEY } from './use-expressions'
import { PICK_KEY } from './use-picked-expressions'

const isList = (data: unknown): data is ExpressionListResponse =>
  typeof data === 'object' && data !== null && 'items' in data

export const useDeleteExpression = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiDelete(`/expressions/${id}`),
    onSuccess: () => {
      queryClient.setQueriesData({ queryKey: [EXPRESSIONS_KEY] }, (data: unknown) =>
        isList(data) ? { items: data.items.filter((item) => item.id !== id) } : data,
      )
      queryClient.removeQueries({ queryKey: [EXPRESSIONS_KEY, 'detail', id] })
      void queryClient.invalidateQueries({ queryKey: [EXPRESSIONS_KEY] })
      void queryClient.invalidateQueries({ queryKey: [PICK_KEY] })
    },
  })
}
