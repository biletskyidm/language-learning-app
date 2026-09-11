import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingSchema } from '@contracts'
import { ApiError, apiPost } from './client'
import { TRAININGS_KEY } from './use-training'

export const useCompleteTraining = (trainingId: string) => {
  const queryClient = useQueryClient()
  const detail = [TRAININGS_KEY, 'detail', trainingId]

  return useMutation({
    mutationFn: () => apiPost(`/trainings/${trainingId}/complete`, undefined, trainingSchema),
    onSuccess: (training) => {
      queryClient.setQueryData(detail, training)
      queryClient.invalidateQueries({ queryKey: [TRAININGS_KEY, 'list'] })
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.code === 'TRAINING_NOT_ACTIVE' || error.code === 'TURN_CONFLICT')) {
        queryClient.invalidateQueries({ queryKey: detail })
      }
    },
  })
}
