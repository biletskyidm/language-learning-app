import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingSchema, type CreateTrainingInput } from '@contracts'
import { apiPost } from './client'
import { TRAININGS_KEY } from './use-training'

export const useCreateTraining = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTrainingInput) => apiPost('/trainings', input, trainingSchema),
    onSuccess: (training) => {
      queryClient.setQueryData([TRAININGS_KEY, 'detail', training.id], training)
    },
  })
}
