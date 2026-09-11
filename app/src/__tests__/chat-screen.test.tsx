import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import type { Assessment, ChatMessage, Training } from '@contracts'
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

const assessment = (targetPhrasesCorrectness: Record<string, number> = {}): Assessment => ({
  contextCorrectness: category,
  grammarAndSyntax: category,
  vocabularyDiversity: category,
  sentenceComplexity: category,
  sentenceNaturalness: category,
  targetPhrasesCorrectness: Object.fromEntries(
    Object.entries(targetPhrasesCorrectness).map(([expression, score]) => [
      expression,
      { ...category, score, correctVersion: `${expression}, correctly` },
    ]),
  ),
  overallFeedback: { strengths: 'good flow', areasForImprovement: 'vary openings' },
})

const userMessage = (content: string, targets: Record<string, number> = {}): ChatMessage => ({
  role: 'user',
  content,
  createdAt: new Date('2026-01-01T00:01:00.000Z'),
  assessment: assessment(targets),
})

const resumed: Training = {
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [
    { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
    { expressionId: 'e2', expression: 'touch base', meaning: 'to make brief contact' },
  ],
  messages: [
    { role: 'assistant', content: 'Morning — how did yesterday go?', createdAt: new Date('2026-01-01T00:00:00.000Z') },
    userMessage('I broke the ice with the client.'),
    { role: 'assistant', content: 'Nice — how did they react?', createdAt: new Date('2026-01-01T00:01:00.000Z') },
  ],
  srsEffects: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const NUDGE = 'Every target landed. Ready to wrap up?'

let queryClient: QueryClient

const open = async (training: Training) => {
  mockedApiGet.mockResolvedValue(training)
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

  await render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={METRICS}>
        <Chat />
      </SafeAreaProvider>
    </QueryClientProvider>,
  )

  await screen.findByText('Morning — how did yesterday go?')
}

describe('Chat screen', () => {
  afterEach(() => queryClient.clear())

  it('resumes a training with its whole history on screen', async () => {
    await open(resumed)

    expect(screen.getByText('I broke the ice with the client.')).toBeTruthy()
    expect(screen.getByText('Nice — how did they react?')).toBeTruthy()
    expect(mockedApiGet).toHaveBeenCalledWith('/trainings/t1', expect.anything())
  })

  it('suggests ending once every target is lit', async () => {
    await open({
      ...resumed,
      messages: [
        ...resumed.messages,
        userMessage('Let us touch base and break the ice.', { 'break the ice': 8, 'touch base': 7 }),
      ],
    })

    expect(screen.getByText(NUDGE)).toBeTruthy()
  })

  it('does not suggest ending while a target is still unlit', async () => {
    await open({
      ...resumed,
      messages: [...resumed.messages, userMessage('I broke the ice.', { 'break the ice': 9, 'touch base': 4 })],
    })

    expect(screen.queryByText(NUDGE)).toBeNull()
  })

  it('shows the averages and the narrative at the top of an ended chat, without a composer', async () => {
    await open({
      ...resumed,
      status: 'COMPLETED',
      completedAt: new Date('2026-01-01T00:10:00.000Z'),
      finalAssessment: {
        averages: {
          contextCorrectness: 7,
          grammarAndSyntax: 8,
          vocabularyDiversity: 6.25,
          sentenceComplexity: 5,
          sentenceNaturalness: 7.5,
        },
        targets: {
          'break the ice': { used: true, usedCorrectly: true, score: 8 },
          'touch base': { used: false, usedCorrectly: false, score: 0 },
        },
        narrative: {
          strengths: 'You kept the conversation moving.',
          areasForImprovement: 'Your sentences stayed short.',
          suggestedFocus: 'Try touch base next time.',
        },
        computedAt: new Date('2026-01-01T00:10:00.000Z'),
      },
    })

    expect(screen.getByText('Context 7.0 · Grammar 8.0 · Vocabulary 6.3 · Complexity 5.0 · Naturalness 7.5')).toBeTruthy()
    expect(screen.getByText('You kept the conversation moving.')).toBeTruthy()
    expect(screen.getByText('Your sentences stayed short.')).toBeTruthy()
    expect(screen.getByText('Try touch base next time.')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Say something')).toBeNull()
    expect(screen.queryByText(NUDGE)).toBeNull()
  })

  it('marks a canceled chat as canceled, without a composer or a summary', async () => {
    await open({ ...resumed, status: 'CANCELED', canceledAt: new Date('2026-01-01T00:10:00.000Z') })

    expect(screen.getByText('Session canceled')).toBeTruthy()
    expect(screen.getByText('I broke the ice with the client.')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Say something')).toBeNull()
  })
})
