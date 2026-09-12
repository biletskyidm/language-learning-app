import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { Training } from '@contracts'
import { ApiError, apiPost } from '../client'
import { useCancelTraining } from '../use-cancel-training'
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

const canceled: Training = { ...active, status: 'CANCELED', canceledAt: NOW }

const LIST_KEY = [TRAININGS_KEY, 'list', {}]
const DETAIL_KEY = [TRAININGS_KEY, 'detail', 't1']

const cancel = async () => {
  const { result } = await renderHook(() => useCancelTraining(), { wrapper })
  await act(async () => {
    result.current.mutate('t1')
  })

  return result
}

describe('useCancelTraining', () => {
  beforeEach(() => {
    mockedApiPost.mockReset()
    mockedApiPost.mockResolvedValue(canceled)
    queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })
    queryClient.setQueryData(DETAIL_KEY, active)
    queryClient.setQueryData(LIST_KEY, { pages: [{ items: [] }], pageParams: [undefined] })
  })

  afterEach(() => queryClient.clear())

  it('cancels the session it is given', async () => {
    const result = await cancel()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPost).toHaveBeenCalledWith('/trainings/t1/cancel', undefined, expect.anything())
  })

  it('puts the canceled training in the cache so an open chat closes without a refetch', async () => {
    const result = await cancel()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(DETAIL_KEY)).toEqual(canceled)
  })

  it('marks the session lists stale so the row moves under Canceled', async () => {
    const result = await cancel()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true)
  })

  it('refetches the session and the lists when it had already ended elsewhere', async () => {
    mockedApiPost.mockRejectedValue(new ApiError(409, 'TRAINING_NOT_ACTIVE', 'This conversation is already over'))

    const result = await cancel()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true)
  })

  it('leaves the cache alone when the request fails for another reason', async () => {
    mockedApiPost.mockRejectedValue(new Error('network down'))

    const result = await cancel()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(DETAIL_KEY)).toEqual(active)
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(false)
  })
})
