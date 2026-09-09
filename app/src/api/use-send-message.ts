import { useMutation, useQueryClient } from '@tanstack/react-query'
import { chatTurnResponseSchema } from '@contracts'
import { ApiError, apiPost } from './client'
import { TRAININGS_KEY } from './use-training'

export const useSendMessage = (trainingId: string) => {
  const queryClient = useQueryClient()
  const detail = [TRAININGS_KEY, 'detail', trainingId]

  return useMutation({
    mutationFn: (content: string) =>
      apiPost(`/trainings/${trainingId}/messages`, { content }, chatTurnResponseSchema),
    onSuccess: ({ training }) => {
      queryClient.setQueryData(detail, training)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'TURN_CONFLICT') {
        queryClient.invalidateQueries({ queryKey: detail })
      }
    },
  })
}
