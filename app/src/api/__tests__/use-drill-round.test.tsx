import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { DrillAnswerResponse, DrillRoundResponse, GapsRound, Training } from '@contracts'
import { ApiError, apiPost } from '../client'
import { useAnswerRound, useNextRound } from '../use-drill-round'
import { EXPRESSIONS_KEY } from '../use-expressions'
import { TRAININGS_KEY } from '../use-training'

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
const DETAIL = [TRAININGS_KEY, 'detail', 't1']

const opened: Training = {
  id: 't1',
  userId: 'me',
  type: 'gaps',
  status: 'ACTIVE',
  targets: [
    { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
    { expressionId: 'e2', expression: 'touch base', meaning: 'to make brief contact' },
  ],
  rounds: [],
  srsEffects: [],
  createdAt: NOW,
}

const dealt: GapsRound = {
  index: 0,
  targets: opened.targets,
  material: {
    parts: ['He tried to ', ' over coffee, then went off to ', ' with his manager.'],
    bank: ['touch base', 'break the ice'],
  },
}

const roundResponse: DrillRoundResponse = {
  round: dealt,
  training: { ...opened, type: 'gaps', rounds: [dealt] },
}

const checked: GapsRound = {
  ...dealt,
  answer: { fills: ['break the ice', 'touch base'] },
  verdict: {
    perBlank: [
      { expected: 'break the ice', given: 'break the ice', correct: true },
      { expected: 'touch base', given: 'touch base', correct: true },
    ],
  },
  answeredAt: NOW,
}

const answerResponse: DrillAnswerResponse = {
  round: checked,
  verdict: checked.verdict as NonNullable<GapsRound['verdict']>,
  srsEffects: [],
  training: { ...opened, type: 'gaps', rounds: [checked] },
}

beforeEach(() => {
  mockedApiPost.mockReset()
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })
  queryClient.setQueryData(DETAIL, opened)
  queryClient.setQueryData([EXPRESSIONS_KEY, '/expressions'], { expressions: [], tags: [] })
})

afterEach(() => queryClient.clear())

describe('useNextRound', () => {
  it('asks the session for its next round', async () => {
    mockedApiPost.mockResolvedValue(roundResponse)
    const { result } = await renderHook(() => useNextRound('t1'), { wrapper })

    await act(async () => {
      result.current.mutate()
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPost).toHaveBeenCalledWith('/trainings/t1/rounds', undefined, expect.anything())
  })

  it('puts the dealt round in the cache so the board shows without a refetch', async () => {
    mockedApiPost.mockResolvedValue(roundResponse)
    const { result } = await renderHook(() => useNextRound('t1'), { wrapper })

    await act(async () => {
      result.current.mutate()
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(DETAIL)).toEqual(roundResponse.training)
  })

  it('marks the session stale when the round is refused as out of date', async () => {
    mockedApiPost.mockRejectedValue(new ApiError(409, 'TURN_CONFLICT', 'This session moved on — reopen it'))
    const { result } = await renderHook(() => useNextRound('t1'), { wrapper })

    await act(async () => {
      result.current.mutate()
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryState(DETAIL)?.isInvalidated).toBe(true)
  })

  it('leaves the session alone when the round simply could not be built', async () => {
    mockedApiPost.mockRejectedValue(new ApiError(502, 'LLM_UNAVAILABLE', 'Could not put together a round'))
    const { result } = await renderHook(() => useNextRound('t1'), { wrapper })

    await act(async () => {
      result.current.mutate()
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryState(DETAIL)?.isInvalidated).toBe(false)
  })
})

describe('useAnswerRound', () => {
  it('submits the filled blanks to the round they belong to', async () => {
    mockedApiPost.mockResolvedValue(answerResponse)
    const { result } = await renderHook(() => useAnswerRound('t1'), { wrapper })

    await act(async () => {
      result.current.mutate({ index: 0, fills: ['break the ice', 'touch base'] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPost).toHaveBeenCalledWith(
      '/trainings/t1/rounds/0/answer',
      { fills: ['break the ice', 'touch base'] },
      expect.anything(),
    )
  })

  it('puts the checked round in the cache', async () => {
    mockedApiPost.mockResolvedValue(answerResponse)
    const { result } = await renderHook(() => useAnswerRound('t1'), { wrapper })

    await act(async () => {
      result.current.mutate({ index: 0, fills: ['break the ice', 'touch base'] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(DETAIL)).toEqual(answerResponse.training)
  })

  it('marks the vocabulary stale so the trained counters catch up with the round', async () => {
    mockedApiPost.mockResolvedValue(answerResponse)
    const { result } = await renderHook(() => useAnswerRound('t1'), { wrapper })

    await act(async () => {
      result.current.mutate({ index: 0, fills: ['break the ice', 'touch base'] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryState([EXPRESSIONS_KEY, '/expressions'])?.isInvalidated).toBe(true)
  })

  it('marks the session stale when the round was already checked elsewhere', async () => {
    mockedApiPost.mockRejectedValue(
      new ApiError(409, 'ROUND_ALREADY_ANSWERED', 'This round is already checked'),
    )
    const { result } = await renderHook(() => useAnswerRound('t1'), { wrapper })

    await act(async () => {
      result.current.mutate({ index: 0, fills: ['break the ice', 'touch base'] })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryState(DETAIL)?.isInvalidated).toBe(true)
  })
})
