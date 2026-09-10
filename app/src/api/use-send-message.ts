import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Crypto from 'expo-crypto'
import { chatTurnResponseSchema } from '@contracts'
import { ApiError, apiPost } from './client'
import { EXPRESSIONS_KEY } from './use-expressions'
import { TRAININGS_KEY } from './use-training'

const newTurnId = () =>
  [...Crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, '0')).join('')

export const useSendMessage = (trainingId: string) => {
  const queryClient = useQueryClient()
  const detail = [TRAININGS_KEY, 'detail', trainingId]
  // Held across attempts so resending after a failure resumes that turn rather than opening a second one;
  // editing the message first makes it a new turn.
  const attempt = useRef<{ content: string; turnId: string }>(undefined)

  return useMutation({
    mutationFn: (content: string) => {
      if (attempt.current?.content !== content) attempt.current = { content, turnId: newTurnId() }

      return apiPost(
        `/trainings/${trainingId}/messages`,
        { content, turnId: attempt.current.turnId },
        chatTurnResponseSchema,
      )
    },
    onSuccess: ({ training }) => {
      attempt.current = undefined
      queryClient.setQueryData(detail, training)
      queryClient.invalidateQueries({ queryKey: [EXPRESSIONS_KEY] })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'TURN_CONFLICT') {
        queryClient.invalidateQueries({ queryKey: detail })
      }
    },
  })
}
