import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import { apiGet } from '../client'
import { SEARCH_DEBOUNCE_MS, useExpressions } from '../use-expressions'

jest.mock('../client', () => ({ apiGet: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const items = [
  {
    id: 'e1',
    userId: 'me',
    expression: 'break the ice',
    type: 'idiom' as const,
    meaning: 'to get a conversation started',
    examples: [],
    tags: [],
    frequency: 'common' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
]

const paths = () => mockedApiGet.mock.calls.map(([path]) => path)

describe('useExpressions', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    mockedApiGet.mockResolvedValue({ items })
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  })

  afterEach(() => queryClient.clear())

  it('loads the whole vocabulary when no search is given', async () => {
    const { result } = await renderHook(() => useExpressions(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toEqual(items)
    expect(paths()).toEqual(['/expressions'])
  })

  it('sends the search term url-encoded', async () => {
    const { result } = await renderHook(() => useExpressions('break the ice'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(paths()).toEqual(['/expressions?search=break%20the%20ice'])
  })

  it('waits for typing to settle before refetching', async () => {
    const { rerender } = await renderHook(({ search }: { search: string }) => useExpressions(search), {
      wrapper,
      initialProps: { search: '' },
    })

    await waitFor(() => expect(paths()).toEqual(['/expressions']))

    await rerender({ search: 'b' })
    await rerender({ search: 'br' })
    await rerender({ search: 'bre' })
    await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS - 100))
    expect(paths()).toEqual(['/expressions'])

    await waitFor(() => expect(paths()).toEqual(['/expressions', '/expressions?search=bre']))
  })
})
