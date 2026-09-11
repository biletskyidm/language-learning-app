import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingSchema } from '@contracts'
import { ApiError, apiPost } from './client'
import { TRAININGS_KEY } from './use-training'

export const useCancelTraining = () => {
  const queryClient = useQueryClient()
  const lists = { queryKey: [TRAININGS_KEY, 'list'] }

  return useMutation({
    mutationFn: (trainingId: string) => apiPost(`/trainings/${trainingId}/cancel`, undefined, trainingSchema),
    onSuccess: (training) => {
      queryClient.setQueryData([TRAININGS_KEY, 'detail', training.id], training)
      queryClient.invalidateQueries(lists)
    },
    onError: (error, trainingId) => {
      if (error instanceof ApiError && error.code === 'TRAINING_NOT_ACTIVE') {
        queryClient.invalidateQueries({ queryKey: [TRAININGS_KEY, 'detail', trainingId] })
        queryClient.invalidateQueries(lists)
      }
    },
  })
}
