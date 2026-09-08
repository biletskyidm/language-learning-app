import { useMutation, useQueryClient } from '@tanstack/react-query'
import { expressionSchema, type UpdateExpressionInput } from '@contracts'
import { apiPatch } from './client'
import { EXPRESSIONS_KEY } from './use-expressions'
import { PICK_KEY } from './use-picked-expressions'

export const useUpdateExpression = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch: UpdateExpressionInput) => apiPatch(`/expressions/${id}`, patch, expressionSchema),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: [EXPRESSIONS_KEY] })
      void queryClient.invalidateQueries({ queryKey: [PICK_KEY] })
      queryClient.setQueryData([EXPRESSIONS_KEY, 'detail', id], updated)
    },
  })
}
