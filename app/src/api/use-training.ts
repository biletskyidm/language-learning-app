import { useQuery } from '@tanstack/react-query'
import { trainingSchema, type Training } from '@contracts'
import { apiGet } from './client'

export const TRAININGS_KEY = 'trainings'

export const useTraining = (id: string) =>
  useQuery<Training>({
    queryKey: [TRAININGS_KEY, 'detail', id],
    queryFn: () => apiGet(`/trainings/${id}`, trainingSchema),
  })
