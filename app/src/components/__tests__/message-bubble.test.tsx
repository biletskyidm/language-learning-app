import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import type { Assessment, ChatMessage } from '@contracts'
import { MessageBubble } from '../message-bubble'

const category = (score: number) => ({ score, messageWithSuggestions: 'try this instead' })

const assessment: Assessment = {
  grammar: category(8),
  vocabularyDiversity: category(6),
  sentenceComplexity: category(4),
  sentenceNaturalness: category(9),
  targetExpressionCorrectness: {},
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

  it('asks for the preview on a long press', async () => {
    const onPreview = jest.fn()
    await render(<MessageBubble message={message({ assessment })} onPreview={onPreview} />)

    await fireEvent(screen.getByTestId('assessed-message'), 'longPress')

    expect(onPreview).toHaveBeenCalled()
  })

  it('stays quiet on a plain tap', async () => {
    const onPreview = jest.fn()
    await render(<MessageBubble message={message({ assessment })} onPreview={onPreview} />)

    await fireEvent.press(screen.getByTestId('assessed-message'))

    expect(onPreview).not.toHaveBeenCalled()
  })

  it('shows no badge on a tutor message', async () => {
    await render(<MessageBubble message={message({ role: 'assistant', assessment: undefined })} />)

    expect(screen.queryByTestId('assessed-message')).toBeNull()
  })

  it('shows no badge on a message still being assessed', async () => {
    await render(<MessageBubble message={message()} />)

    expect(screen.queryByTestId('assessed-message')).toBeNull()
  })
})
