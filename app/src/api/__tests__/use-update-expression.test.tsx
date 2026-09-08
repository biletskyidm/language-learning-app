import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { Expression, UpdateExpressionInput } from '@contracts'
import { apiPatch } from '../client'
import { useUpdateExpression } from '../use-update-expression'
import { EXPRESSIONS_KEY } from '../use-expressions'
import { PICK_KEY } from '../use-picked-expressions'

jest.mock('../client', () => ({ apiPatch: jest.fn() }))

const mockedApiPatch = apiPatch as jest.MockedFunction<typeof apiPatch>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const stored: Expression = {
  id: 'e1',
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom',
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const updated: Expression = { ...stored, meaning: 'to make people feel at ease' }

const LIST_KEY = [EXPRESSIONS_KEY, '/expressions']
const DETAIL_KEY = [EXPRESSIONS_KEY, 'detail', 'e1']

const submit = async (patch: UpdateExpressionInput) => {
  const { result } = await renderHook(() => useUpdateExpression('e1'), { wrapper })
  await act(async () => {
    result.current.mutate(patch)
  })

  return result
}

describe('useUpdateExpression', () => {
  beforeEach(() => {
    mockedApiPatch.mockReset()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false, gcTime: 0 } },
    })
    queryClient.setQueryData([PICK_KEY], { items: [] })
    queryClient.setQueryData(LIST_KEY, { items: [stored] })
    queryClient.setQueryData(DETAIL_KEY, stored)
  })

  afterEach(() => queryClient.clear())

  it('patches only the fields it was given', async () => {
    mockedApiPatch.mockResolvedValue(updated)

    const result = await submit({ meaning: updated.meaning })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPatch).toHaveBeenCalledWith('/expressions/e1', { meaning: updated.meaning }, expect.anything())
  })

  it('shows the saved expression on the detail screen without a refetch', async () => {
    mockedApiPatch.mockResolvedValue(updated)

    const result = await submit({ meaning: updated.meaning })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(DETAIL_KEY)).toEqual(updated)
  })

  it('marks the cached list stale so the row picks up the change', async () => {
    mockedApiPatch.mockResolvedValue(updated)

    const result = await submit({ meaning: updated.meaning })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true)
  })

  it('leaves the caches alone when the API refuses', async () => {
    mockedApiPatch.mockRejectedValue(new Error('PATCH /expressions/e1 failed with 400'))

    const result = await submit({ meaning: updated.meaning })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(DETAIL_KEY)).toEqual(stored)
  })

  it('marks the practice list stale so an edited row cannot linger there', async () => {
    mockedApiPatch.mockResolvedValue(updated)

    const result = await submit({ meaning: updated.meaning })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryState([PICK_KEY])?.isInvalidated).toBe(true)
  })
})
