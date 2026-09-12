import { useMutation, useQueryClient } from '@tanstack/react-query'
import { drillAnswerResponseSchema, drillRoundResponseSchema } from '@contracts'
import { ApiError, apiPost } from './client'
import { EXPRESSIONS_KEY } from './use-expressions'
import { TRAININGS_KEY } from './use-training'

const STALE_CODES = ['TURN_CONFLICT', 'ROUND_ALREADY_ANSWERED', 'TRAINING_NOT_ACTIVE']

export const useNextRound = (trainingId: string) => {
  const queryClient = useQueryClient()
  const detail = [TRAININGS_KEY, 'detail', trainingId]

  return useMutation({
    mutationFn: () => apiPost(`/trainings/${trainingId}/rounds`, undefined, drillRoundResponseSchema),
    onSuccess: ({ training }) => queryClient.setQueryData(detail, training),
    onError: (error) => {
      if (error instanceof ApiError && STALE_CODES.includes(error.code)) {
        queryClient.invalidateQueries({ queryKey: detail })
      }
    },
  })
}

export const useAnswerRound = (trainingId: string) => {
  const queryClient = useQueryClient()
  const detail = [TRAININGS_KEY, 'detail', trainingId]

  return useMutation({
    mutationFn: ({ index, fills }: { index: number; fills: string[] }) =>
      apiPost(`/trainings/${trainingId}/rounds/${index}/answer`, { fills }, drillAnswerResponseSchema),
    onSuccess: ({ training }) => {
      queryClient.setQueryData(detail, training)
      queryClient.invalidateQueries({ queryKey: [EXPRESSIONS_KEY] })
    },
    onError: (error) => {
      if (error instanceof ApiError && STALE_CODES.includes(error.code)) {
        queryClient.invalidateQueries({ queryKey: detail })
      }
    },
  })
}
