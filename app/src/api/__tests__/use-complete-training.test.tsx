import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { Training } from '@contracts'
import { ApiError, apiPost } from '../client'
import { useCompleteTraining } from '../use-complete-training'
import { TRAININGS_KEY } from '../use-training'

jest.mock('expo-crypto', () => ({ getRandomValues: jest.fn() }))
jest.mock('../client', () => ({
  ...jest.requireActual('../client'),
  apiPost: jest.fn(),
}))

const mockedApiPost = apiPost as jest.MockedFunction<typeof apiPost>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const NOW = new Date('2026-01-01T00:00:00.000Z')

const active: Training = {
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [{ expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' }],
  messages: [{ role: 'assistant', content: 'Morning — how did yesterday go?', createdAt: NOW }],
  srsEffects: [],
  createdAt: NOW,
}

const completed: Training = {
  ...active,
  status: 'COMPLETED',
  completedAt: NOW,
  finalAssessment: {
    averages: {
      contextCorrectness: 7,
      grammarAndSyntax: 8,
      vocabularyDiversity: 6,
      sentenceComplexity: 5,
      sentenceNaturalness: 7,
    },
    targets: { 'break the ice': { used: true, usedCorrectly: true, score: 8 } },
    narrative: { strengths: 'Clear.', areasForImprovement: 'Short sentences.', suggestedFocus: 'Linkers.' },
    computedAt: NOW,
  },
}

const LIST_KEY = [TRAININGS_KEY, 'list', {}]
const DETAIL_KEY = [TRAININGS_KEY, 'detail', 't1']

const end = async () => {
  const { result } = await renderHook(() => useCompleteTraining('t1'), { wrapper })
  await act(async () => {
    result.current.mutate()
  })

  return result
}

describe('useCompleteTraining', () => {
  beforeEach(() => {
    mockedApiPost.mockReset()
    mockedApiPost.mockResolvedValue(completed)
    queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })
    queryClient.setQueryData(DETAIL_KEY, active)
    queryClient.setQueryData(LIST_KEY, { pages: [{ items: [] }], pageParams: [undefined] })
  })

  afterEach(() => queryClient.clear())

  it('ends the conversation it belongs to', async () => {
    const result = await end()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPost).toHaveBeenCalledWith('/trainings/t1/complete', undefined, expect.anything())
  })

  it('puts the ended training in the cache so the averages show without a refetch', async () => {
    const result = await end()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(DETAIL_KEY)).toEqual(completed)
  })

  it('marks the session lists stale so the row picks up the averages', async () => {
    const result = await end()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true)
  })

  it('refetches the conversation when it had already ended elsewhere', async () => {
    mockedApiPost.mockRejectedValue(new ApiError(409, 'TRAINING_NOT_ACTIVE', 'This conversation is already over'))

    const result = await end()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true)
  })

  it('leaves the conversation active when the summary could not be written', async () => {
    mockedApiPost.mockRejectedValue(new ApiError(502, 'LLM_UNAVAILABLE', 'Could not sum up this conversation'))

    const result = await end()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(DETAIL_KEY)).toEqual(active)
  })
})
