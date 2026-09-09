import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import type { Assessment, ChatMessage } from '@contracts'
import { MessageBubble } from '../message-bubble'

const category = (score: number, suggestion: string) => ({ score, messageWithSuggestions: suggestion })

const assessment: Assessment = {
  grammar: category(8, 'I went to the shop'),
  vocabularyDiversity: category(6, 'vary your verbs'),
  sentenceComplexity: category(4, 'join the clauses'),
  sentenceNaturalness: category(9, 'sounds native'),
  targetExpressionCorrectness: {
    'break the ice': {
      score: 7,
      messageWithSuggestions: 'nearly right',
      correctVersion: 'I broke the ice with a joke',
    },
  },
}

const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  role: 'user',
  content: 'I broke the ice',
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  ...overrides,
})

describe('MessageBubble', () => {
  it('shows the overall score with one decimal', async () => {
    await render(<MessageBubble message={message({ assessment })} />)

    expect(screen.getByText('6.8')).toBeTruthy()
  })

  it('keeps the breakdown collapsed until tapped', async () => {
    await render(<MessageBubble message={message({ assessment })} />)

    expect(screen.queryByText('Grammar')).toBeNull()
  })

  it('expands the four categories and the targets on tap', async () => {
    await render(<MessageBubble message={message({ assessment })} />)

    await fireEvent.press(screen.getByTestId('assessment-badge'))

    expect(screen.getByText('Grammar')).toBeTruthy()
    expect(screen.getByText('I went to the shop')).toBeTruthy()
    expect(screen.getByText('Naturalness')).toBeTruthy()
    expect(screen.getByText('break the ice')).toBeTruthy()
    expect(screen.getByText('I broke the ice with a joke')).toBeTruthy()
  })

  it('collapses again on a second tap', async () => {
    await render(<MessageBubble message={message({ assessment })} />)

    await fireEvent.press(screen.getByTestId('assessment-badge'))
    await fireEvent.press(screen.getByTestId('assessment-badge'))

    expect(screen.queryByText('Grammar')).toBeNull()
  })

  it('shows no badge on a tutor message', async () => {
    await render(<MessageBubble message={message({ role: 'assistant', assessment: undefined })} />)

    expect(screen.queryByTestId('assessment-badge')).toBeNull()
  })

  it('shows no badge on a message still being assessed', async () => {
    await render(<MessageBubble message={message()} />)

    expect(screen.queryByTestId('assessment-badge')).toBeNull()
  })
})
