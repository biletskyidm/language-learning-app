import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingSchema } from '@contracts'
import { ApiError, apiPost } from './client'
import { EXPRESSIONS_KEY } from './use-expressions'
import { TRAININGS_KEY } from './use-training'

export const useCompleteTraining = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (trainingId: string) => apiPost(`/trainings/${trainingId}/complete`, undefined, trainingSchema),
    onSuccess: (training) => {
      queryClient.setQueryData([TRAININGS_KEY, 'detail', training.id], training)
      queryClient.invalidateQueries({ queryKey: [TRAININGS_KEY, 'list'] })
      queryClient.invalidateQueries({ queryKey: [EXPRESSIONS_KEY, 'history'] })
    },
    onError: (error, trainingId) => {
      if (error instanceof ApiError && (error.code === 'TRAINING_NOT_ACTIVE' || error.code === 'TURN_CONFLICT')) {
        queryClient.invalidateQueries({ queryKey: [TRAININGS_KEY, 'detail', trainingId] })
      }
    },
  })
}
