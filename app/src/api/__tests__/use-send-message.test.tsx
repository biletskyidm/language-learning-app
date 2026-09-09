import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { ChatTurnResponse, Training } from '@contracts'
import { ApiError, apiPost } from '../client'
import { EXPRESSIONS_KEY } from '../use-expressions'
import { useSendMessage } from '../use-send-message'
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
const CONTENT = 'I broke the ice with the client.'

const category = { score: 8, feedback: 'clear enough', suggestions: CONTENT }

const opened: Training = {
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [{ expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' }],
  messages: [{ role: 'assistant', content: 'Morning — how did yesterday go?', createdAt: NOW }],
  createdAt: NOW,
}

const turn: ChatTurnResponse = {
  reply: { role: 'assistant', content: 'Nice one. Any numbers back yet?', createdAt: NOW },
  assessment: {
    contextCorrectness: category,
    grammarAndSyntax: category,
    vocabularyDiversity: category,
    sentenceComplexity: category,
    sentenceNaturalness: category,
    targetPhrasesCorrectness: {},
    overallFeedback: { strengths: 'confident opening', areasForImprovement: 'stay on the topic' },
  },
  training: {
    ...opened,
    messages: [
      ...opened.messages,
      { role: 'user', content: CONTENT, createdAt: NOW },
      { role: 'assistant', content: 'Nice one. Any numbers back yet?', createdAt: NOW },
    ],
  },
}

const send = async (content: string) => {
  const { result } = await renderHook(() => useSendMessage('t1'), { wrapper })
  await act(async () => {
    result.current.mutate(content)
  })

  return result
}

describe('useSendMessage', () => {
  beforeEach(() => {
    mockedApiPost.mockReset()
    mockedApiPost.mockResolvedValue(turn)
    queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })
    queryClient.setQueryData([TRAININGS_KEY, 'detail', 't1'], opened)
    queryClient.setQueryData([EXPRESSIONS_KEY, '/expressions'], { expressions: [], tags: [] })
  })

  afterEach(() => queryClient.clear())

  it('sends the typed message to the conversation it belongs to', async () => {
    const result = await send(CONTENT)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPost).toHaveBeenCalledWith('/trainings/t1/messages', { content: CONTENT }, expect.anything())
  })

  it('puts the whole turn in the cache so the reply shows without a refetch', async () => {
    const result = await send(CONTENT)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData([TRAININGS_KEY, 'detail', 't1'])).toEqual(turn.training)
  })

  it('marks the vocabulary stale so the trained counter catches up with the turn', async () => {
    const result = await send(CONTENT)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryState([EXPRESSIONS_KEY, '/expressions'])?.isInvalidated).toBe(true)
  })

  it('marks the conversation stale when the turn is refused as out of date', async () => {
    mockedApiPost.mockRejectedValue(new ApiError(409, 'TURN_CONFLICT', 'This conversation moved on — reopen it'))

    const result = await send(CONTENT)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryState([TRAININGS_KEY, 'detail', 't1'])?.isInvalidated).toBe(true)
  })

  it('leaves the conversation untouched when the turn is refused, so the draft is not lost', async () => {
    mockedApiPost.mockRejectedValue(new Error('POST /trainings/t1/messages failed with 502'))

    const result = await send(CONTENT)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData([TRAININGS_KEY, 'detail', 't1'])).toEqual(opened)
    expect(result.current.variables).toBe(CONTENT)
  })
})
