import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { CreateTrainingInput, Training } from '@contracts'
import { apiPost } from '../client'
import { useCreateTraining } from '../use-create-training'
import { TRAININGS_KEY } from '../use-training'

jest.mock('../client', () => ({ apiPost: jest.fn() }))

const mockedApiPost = apiPost as jest.MockedFunction<typeof apiPost>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const created: Training = {
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [{ expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' }],
  messages: [{ role: 'assistant', content: 'Morning — how did yesterday go?', createdAt: new Date() }],
  srsEffects: [],
  createdAt: new Date(),
}

const start = async (input: CreateTrainingInput) => {
  const { result } = await renderHook(() => useCreateTraining(), { wrapper })
  await act(async () => {
    result.current.mutate(input)
  })

  return result
}

const chat = { type: 'chat' as const, context: 'a scrum standup', style: 'informal' as const }

describe('useCreateTraining', () => {
  beforeEach(() => {
    mockedApiPost.mockReset()
    mockedApiPost.mockResolvedValue(created)
    queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })
  })

  afterEach(() => queryClient.clear())

  it('starts a chat on the expressions the user chose', async () => {
    const result = await start({ ...chat, expressionIds: ['e1', 'e2'] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPost).toHaveBeenCalledWith(
      '/trainings',
      { ...chat, expressionIds: ['e1', 'e2'] },
      expect.anything(),
    )
  })

  it('leaves the choice to the backend when no expressions are named', async () => {
    const result = await start(chat)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPost).toHaveBeenCalledWith('/trainings', chat, expect.anything())
  })

  it('primes the chat cache so the opening message shows without a refetch', async () => {
    const result = await start(chat)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData([TRAININGS_KEY, 'detail', 't1'])).toEqual(created)
  })

  it('surfaces a refused start so the screen can keep the draft context', async () => {
    mockedApiPost.mockRejectedValue(new Error('POST /trainings failed with 502'))

    const result = await start(chat)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData([TRAININGS_KEY, 'detail', 't1'])).toBeUndefined()
  })
})
