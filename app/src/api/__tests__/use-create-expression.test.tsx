import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { CreateExpressionInput, Expression } from '@contracts'
import { apiPost } from '../client'
import { useCreateExpression } from '../use-create-expression'
import { EXPRESSIONS_KEY } from '../use-expressions'

jest.mock('../client', () => ({ apiPost: jest.fn() }))

const mockedApiPost = apiPost as jest.MockedFunction<typeof apiPost>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const input: CreateExpressionInput = {
  expression: 'hit the nail on the head',
  type: 'idiom',
  meaning: 'to describe exactly what is causing a problem',
  examples: [],
  tags: [],
  frequency: 'common',
}

const existing: Expression = {
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

const created: Expression = { ...existing, id: 'new', expression: input.expression, meaning: input.meaning }

const LIST_KEY = [EXPRESSIONS_KEY, '/expressions']

const listed = () => queryClient.getQueryData<{ items: Expression[] }>(LIST_KEY)?.items.map((e) => e.expression)

const submit = async () => {
  const { result } = await renderHook(() => useCreateExpression(), { wrapper })
  await act(async () => {
    result.current.mutate(input)
  })

  return result
}

describe('useCreateExpression', () => {
  beforeEach(() => {
    mockedApiPost.mockReset()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false, gcTime: 0 } } })
    queryClient.setQueryData(LIST_KEY, { items: [existing] })
  })

  afterEach(() => queryClient.clear())

  it('shows the new expression at the top of the list before the API answers', async () => {
    let resolve: (value: Expression) => void = () => {}
    mockedApiPost.mockReturnValue(new Promise<Expression>((r) => (resolve = r)) as ReturnType<typeof apiPost>)

    const result = await submit()

    expect(listed()).toEqual(['hit the nail on the head', 'break the ice'])
    expect(mockedApiPost).toHaveBeenCalledWith('/expressions', input, expect.anything())

    await act(async () => resolve(created))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('puts the list back the way it was when the API refuses', async () => {
    mockedApiPost.mockRejectedValue(new Error('POST /expressions failed with 409'))

    const result = await submit()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(listed()).toEqual(['break the ice'])
  })

  it('primes the detail cache so the created expression opens without a refetch', async () => {
    mockedApiPost.mockResolvedValue(created)

    const result = await submit()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData([EXPRESSIONS_KEY, 'detail', 'new'])).toEqual(created)
  })
})
