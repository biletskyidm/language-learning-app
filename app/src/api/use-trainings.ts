import { useInfiniteQuery } from '@tanstack/react-query'
import { trainingListResponseSchema, type TrainingStatus, type TrainingType } from '@contracts'
import { apiGet } from './client'
import { TRAININGS_KEY } from './use-training'

export type TrainingFilters = { type?: TrainingType; status?: TrainingStatus }

const trainingsPath = ({ type, status }: TrainingFilters, before?: Date) => {
  const parts: string[] = []
  if (type) parts.push(`type=${type}`)
  if (status) parts.push(`status=${status}`)
  if (before) parts.push(`before=${encodeURIComponent(before.toISOString())}`)

  return parts.length ? `/trainings?${parts.join('&')}` : '/trainings'
}

export const useTrainings = (filters: TrainingFilters) =>
  useInfiniteQuery({
    queryKey: [TRAININGS_KEY, 'list', filters],
    queryFn: ({ pageParam }) => apiGet(trainingsPath(filters, pageParam), trainingListResponseSchema),
    initialPageParam: undefined as Date | undefined,
    getNextPageParam: (last) => last.nextBefore,
  })
