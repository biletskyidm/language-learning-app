import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { Expression } from '@contracts'
import { apiDelete } from '../client'
import { useDeleteExpression } from '../use-delete-expression'
import { EXPRESSIONS_KEY } from '../use-expressions'

jest.mock('../client', () => ({ apiDelete: jest.fn() }))

const mockedApiDelete = apiDelete as jest.MockedFunction<typeof apiDelete>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const expression = (id: string): Expression => ({
  id,
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom',
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
})

const stored = expression('e1')
const other = expression('e2')

const LIST_KEY = [EXPRESSIONS_KEY, '/expressions']
const DETAIL_KEY = [EXPRESSIONS_KEY, 'detail', 'e1']

const listed = () => (queryClient.getQueryData(LIST_KEY) as { items: Expression[] }).items.map((e) => e.id)

const remove = async () => {
  const { result } = await renderHook(() => useDeleteExpression('e1'), { wrapper })
  await act(async () => {
    result.current.mutate()
  })

  return result
}

describe('useDeleteExpression', () => {
  beforeEach(() => {
    mockedApiDelete.mockReset()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false, gcTime: 0 } },
    })
    queryClient.setQueryData(LIST_KEY, { items: [stored, other] })
    queryClient.setQueryData(DETAIL_KEY, stored)
  })

  afterEach(() => queryClient.clear())

  it('asks the API to delete the expression', async () => {
    mockedApiDelete.mockResolvedValue(undefined)

    const result = await remove()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiDelete).toHaveBeenCalledWith('/expressions/e1')
  })

  it('drops the row from the cached list and leaves the others', async () => {
    mockedApiDelete.mockResolvedValue(undefined)

    const result = await remove()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listed()).toEqual(['e2'])
  })

  it('forgets the cached detail so a stale card can never be shown', async () => {
    mockedApiDelete.mockResolvedValue(undefined)

    const result = await remove()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(DETAIL_KEY)).toBeUndefined()
  })

  it('marks the cached list stale so it refetches', async () => {
    mockedApiDelete.mockResolvedValue(undefined)

    const result = await remove()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true)
  })

  it('hands control back to the caller without waiting for the list to refetch', async () => {
    mockedApiDelete.mockResolvedValue(undefined)
    let releaseRefetch = () => {}
    const observer = new QueryObserver(queryClient, {
      queryKey: LIST_KEY,
      queryFn: () => new Promise<{ items: Expression[] }>((resolve) => (releaseRefetch = () => resolve({ items: [other] }))),
    })
    const unsubscribe = observer.subscribe(() => {})
    const navigated = jest.fn()

    const { result } = await renderHook(() => useDeleteExpression('e1'), { wrapper })
    await act(async () => {
      result.current.mutate(undefined, { onSuccess: navigated })
    })

    await waitFor(() => expect(navigated).toHaveBeenCalled())
    expect(queryClient.getQueryState(LIST_KEY)?.fetchStatus).toBe('fetching')

    releaseRefetch()
    unsubscribe()
  })

  it('leaves the caches alone when the API refuses', async () => {
    mockedApiDelete.mockRejectedValue(new Error('DELETE /expressions/e1 failed with 404'))

    const result = await remove()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(listed()).toEqual(['e1', 'e2'])
    expect(queryClient.getQueryData(DETAIL_KEY)).toEqual(stored)
  })
})
