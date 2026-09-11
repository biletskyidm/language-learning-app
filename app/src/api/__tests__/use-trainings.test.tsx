import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { TrainingSummary } from '@contracts'
import { apiGet } from '../client'
import { useTrainings, type TrainingFilters } from '../use-trainings'

jest.mock('../client', () => ({ apiGet: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const summary = (id: string, createdAt: string): TrainingSummary => ({
  id,
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [],
  createdAt: new Date(createdAt),
})

const paths = () => mockedApiGet.mock.calls.map(([path]) => path)

const load = async (filters: TrainingFilters) => {
  const hook = await renderHook((props: TrainingFilters) => useTrainings(props), { wrapper, initialProps: filters })
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))

  return hook
}

describe('useTrainings', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    mockedApiGet.mockResolvedValue({ items: [summary('t1', '2026-01-02T00:00:00.000Z')] })
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  })

  afterEach(() => queryClient.clear())

  it('lists every training when no filter is chosen', async () => {
    const { result } = await load({})

    expect(paths()).toEqual(['/trainings'])
    expect(result.current.data?.pages[0].items.map(({ id }) => id)).toEqual(['t1'])
  })

  it('asks for the chosen type and status', async () => {
    await load({ type: 'chat', status: 'ACTIVE' })

    expect(paths()).toEqual(['/trainings?type=chat&status=ACTIVE'])
  })

  it('refetches when the filter changes', async () => {
    const { rerender } = await load({})

    await rerender({ status: 'CANCELED' })

    await waitFor(() => expect(paths()).toEqual(['/trainings', '/trainings?status=CANCELED']))
  })

  it('loads older trainings from the cursor while keeping the filter', async () => {
    mockedApiGet
      .mockResolvedValueOnce({
        items: [summary('t2', '2026-01-03T00:00:00.000Z')],
        nextBefore: new Date('2026-01-03T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({ items: [summary('t1', '2026-01-02T00:00:00.000Z')] })

    const { result } = await load({ status: 'ACTIVE' })
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() =>
      expect(result.current.data?.pages.flatMap((page) => page.items.map(({ id }) => id))).toEqual(['t2', 't1']),
    )
    expect(paths()).toEqual(['/trainings?status=ACTIVE', '/trainings?status=ACTIVE&before=2026-01-03T00%3A00%3A00.000Z'])
    expect(result.current.hasNextPage).toBe(false)
  })
})
