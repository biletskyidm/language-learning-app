import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import type { Training } from '@contracts'
import Chat from '../../app/trainings/[id]'
import { apiGet } from '../api/client'

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 't1' }),
}))
jest.mock('expo-crypto', () => ({ getRandomValues: jest.fn() }))
jest.mock('../api/client', () => ({ ApiError: class extends Error {}, apiGet: jest.fn(), apiPost: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }

const category = { score: 8, feedback: 'clear enough', suggestions: 'I broke the ice with the client.' }

const resumed: Training = {
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [{ expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' }],
  messages: [
    { role: 'assistant', content: 'Morning — how did yesterday go?', createdAt: new Date('2026-01-01T00:00:00.000Z') },
    {
      role: 'user',
      content: 'I broke the ice with the client.',
      createdAt: new Date('2026-01-01T00:01:00.000Z'),
      assessment: {
        contextCorrectness: category,
        grammarAndSyntax: category,
        vocabularyDiversity: category,
        sentenceComplexity: category,
        sentenceNaturalness: category,
        targetPhrasesCorrectness: {},
        overallFeedback: { strengths: 'good flow', areasForImprovement: 'vary openings' },
      },
    },
    { role: 'assistant', content: 'Nice — how did they react?', createdAt: new Date('2026-01-01T00:01:00.000Z') },
  ],
  srsEffects: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

describe('Chat screen', () => {
  it('resumes a training with its whole history on screen', async () => {
    mockedApiGet.mockResolvedValue(resumed)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

    await render(
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider initialMetrics={METRICS}>
          <Chat />
        </SafeAreaProvider>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Morning — how did yesterday go?')).toBeTruthy()
    expect(screen.getByText('I broke the ice with the client.')).toBeTruthy()
    expect(screen.getByText('Nice — how did they react?')).toBeTruthy()
    expect(mockedApiGet).toHaveBeenCalledWith('/trainings/t1', expect.anything())

    queryClient.clear()
  })
})
