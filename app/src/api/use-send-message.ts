import { useMutation, useQueryClient } from '@tanstack/react-query'
import { chatTurnResponseSchema } from '@contracts'
import { apiPost } from './client'
import { TRAININGS_KEY } from './use-training'

export const useSendMessage = (trainingId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: string) =>
      apiPost(`/trainings/${trainingId}/messages`, { content }, chatTurnResponseSchema),
    onSuccess: ({ training }) => {
      queryClient.setQueryData([TRAININGS_KEY, 'detail', trainingId], training)
    },
  })
}
